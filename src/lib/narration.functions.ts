import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LearningScene, SlideScenes } from "@/lib/learningScenes";
import { scenePhaseLines } from "@/lib/learningScenes";

const SlideIn = z.object({
  title: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

const Input = z.object({
  courseTitle: z.string().default("this training"),
  courseId: z.string().optional(),
  slides: z.array(SlideIn).min(1).max(80),
});

const DescriptionInput = z.object({
  courseTitle: z.string().default("this training"),
  slides: z.array(SlideIn).min(1).max(80),
});

const DEFAULT_TEMPLATE = `You are designing a teaching VIDEO for "{{courseTitle}}".
Tone: {{tone}}. Audience: {{audience}}. Technical depth (1=simple, 5=expert): {{depth}}.

Think like a great YouTube educator. NEVER just read the bullets. Teach concepts using:
INTRO -> ANALOGY -> REAL-WORLD EXAMPLE -> TECHNICAL EXPLANATION -> TAKEAWAY.
ONE concept per scene. If a source slide contains multiple concepts (e.g. "Perception, Language, Prediction, Decision"), SPLIT it into multiple scenes — one per concept. Dense slides should have 2-4 scenes.

For EACH scene, return a JSON object with:
- "concept": (1-3 word noun)
- "intro": (one sentence, address learner as "you")
- "analogy": { "caption": "string", "nodes": ["string", "string"] } (2-4 nodes)
- "example": { "caption": "string", "nodes": ["string", "string"] } (2-4 nodes)
- "technical": { "caption": "string", "nodes": ["string", "string"] } (2-5 nodes)
- "takeaway": (one sentence)
- "narration": { "intro": "...", "analogy": "...", "example": "...", "technical": "...", "takeaway": "..." } (each 25-45 words)
- "keywords": ["word1", "word2", "word3"]

Return STRICT JSON ONLY:
{ "slides": [ { "sourceSlideIdx": 0, "scenes": [ { ... }, ... ] }, ... ] }
with exactly {{slideCount}} entries in "slides", in the same order as the deck.

DECK:
{{deck}}`;

const SCENE_OUTPUT_CONTRACT = `

SCENE OUTPUT CONTRACT — ignore any older template instructions that ask for narrations/keywords only.
Return exactly one JSON object with this shape and no markdown:
{
  "slides": [
    {
      "sourceSlideIdx": 0,
      "scenes": [
        {
          "concept": "short concept name",
          "intro": "one direct teaching sentence",
          "analogy": { "caption": "human analogy", "nodes": ["start", "middle", "end"] },
          "example": { "caption": "real-world example", "nodes": ["input", "action", "outcome"] },
          "technical": { "caption": "technical pipeline", "nodes": ["input", "processing", "model", "output"] },
          "takeaway": "one memorable sentence",
          "narration": {
            "intro": "25-45 spoken words",
            "analogy": "25-45 spoken words",
            "example": "25-45 spoken words",
            "technical": "25-45 spoken words",
            "takeaway": "25-45 spoken words"
          },
          "keywords": ["data", "model"]
        }
      ]
    }
  ]
}`;

type CourseCfg = {
  tone: string;
  audience: string;
  tech_depth: number;
  prompt_override: string | null;
};

async function loadCourseCfg(courseId: string | undefined): Promise<CourseCfg> {
  if (!courseId) {
    return { tone: "conversational", audience: "business professionals", tech_depth: 3, prompt_override: null };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("courses")
    .select("tone, audience, tech_depth, prompt_override")
    .eq("id", courseId)
    .maybeSingle();
  return {
    tone: (data?.tone as string) ?? "conversational",
    audience: (data?.audience as string) ?? "business professionals",
    tech_depth: (data?.tech_depth as number) ?? 3,
    prompt_override: (data?.prompt_override as string | null) ?? null,
  };
}

async function loadGlobalTemplate(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("prompt_templates")
      .select("template")
      .eq("scope", "global")
      .maybeSingle();
    return (data?.template as string) || DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

function sceneTemplateFrom(template: string): string {
  // Older saved templates return { narrations, keywords }. The slide player now
  // needs structured learning scenes, so fall back to the scene contract here.
  return /"scenes"|\bscenes\b|technical pipeline/i.test(template) ? template : DEFAULT_TEMPLATE;
}

function scenePromptFrom(basePrompt: string): string {
  return `${basePrompt}${SCENE_OUTPUT_CONTRACT}`;
}

function renderTemplate(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

type ModelUsed = "gemini-3.1-pro" | "gemini-flash-fallback";

const MODEL_LABEL: Record<ModelUsed, { provider: string; model: string }> = {
  "gemini-3.1-pro": { provider: "Google (admin key)", model: "gemini-3.1-pro-preview" },
  "gemini-flash-fallback": { provider: "Lovable AI Gateway", model: "google/gemini-3-flash-preview" },
};

type LogCtx = {
  userId?: string;
  courseId?: string | null;
  kind: string;
  slideCount?: number;
};

async function writeLog(
  ctx: LogCtx,
  modelUsed: ModelUsed,
  status: "ok" | "error",
  detail: string | null,
  durationMs: number,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const meta = MODEL_LABEL[modelUsed];
    await supabaseAdmin.from("generation_logs").insert({
      user_id: ctx.userId ?? null,
      course_id: ctx.courseId ?? null,
      kind: ctx.kind,
      model: meta.model,
      provider: meta.provider,
      status,
      detail: detail?.slice(0, 500) ?? null,
      slide_count: ctx.slideCount ?? null,
      duration_ms: durationMs,
    });
  } catch {
    /* logging must never break generation */
  }
}

async function generateJson(prompt: string, ctx: LogCtx): Promise<{ text: string; modelUsed: ModelUsed }> {
  const started = Date.now();
  const geminiKey = process.env.GEMINI_API_KEY;
  const modelUsed: ModelUsed = geminiKey ? "gemini-3.1-pro" : "gemini-flash-fallback";
  try {
    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 16384, responseMimeType: "application/json" },
          }),
        },
      );
      const raw = await res.text();
      if (!res.ok) throw new Error(`Gemini 3.1 Pro failed (${res.status}): ${raw.slice(0, 300)}`);
      const json = JSON.parse(raw) as {
        candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
      };
      const candidate = json.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (candidate?.finishReason === "MAX_TOKENS") throw new Error("Gemini 3.1 Pro response was truncated.");
      if (!text) throw new Error(`Gemini 3.1 Pro returned no JSON. Finish reason: ${candidate?.finishReason ?? "unknown"}`);
      await writeLog(ctx, modelUsed, "ok", null, Date.now() - started);
      return { text, modelUsed };
    }
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
      temperature: 0.2,
    });
    await writeLog(ctx, modelUsed, "ok", null, Date.now() - started);
    return { text, modelUsed };
  } catch (e) {
    await writeLog(ctx, modelUsed, "error", (e as Error).message, Date.now() - started);
    throw e;
  }
}

function extractJson<T>(text: string): T {
  // Strip markdown fences
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Find first { or [ and matching last } or ]
  const startIdx = cleaned.search(/[\{\[]/);
  if (startIdx === -1) throw new Error("AI did not return JSON");
  const startChar = cleaned[startIdx];
  const endChar = startChar === "[" ? "]" : "}";
  const endIdx = cleaned.lastIndexOf(endChar);
  if (endIdx === -1 || endIdx < startIdx) throw new Error("AI did not return JSON");
  cleaned = cleaned.substring(startIdx, endIdx + 1);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Walk the string respecting strings/escapes to find the first balanced object/array.
    let depth = 0;
    let inStr = false;
    let esc = false;
    let balancedEnd = -1;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) { balancedEnd = i; break; }
      }
    }
    if (balancedEnd > 0) {
      const slice = cleaned.substring(0, balancedEnd + 1);
      try { return JSON.parse(slice) as T; } catch {}
    }

    // Last-resort repairs: strip control chars, trailing commas, balance brackets.
    let repaired = cleaned
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");
    let braces = 0, brackets = 0, inStr2 = false, esc2 = false;
    for (const ch of repaired) {
      if (inStr2) {
        if (esc2) esc2 = false;
        else if (ch === "\\") esc2 = true;
        else if (ch === '"') inStr2 = false;
        continue;
      }
      if (ch === '"') inStr2 = true;
      else if (ch === "{") braces++;
      else if (ch === "}") braces--;
      else if (ch === "[") brackets++;
      else if (ch === "]") brackets--;
    }
    while (brackets-- > 0) repaired += "]";
    while (braces-- > 0) repaired += "}";
    return JSON.parse(repaired) as T;
  }
}

function sceneNarrationToText(scene: LearningScene): string {
  return scenePhaseLines(scene).map((p) => p.text).join(" ");
}

/** Repair OCR-fragmented bullets: merge lines that don't end with sentence
 *  punctuation with the next line, drop noise, deduplicate. */
function repairBullets(raw: string[]): string[] {
  const cleaned = raw.map((b) => b.replace(/\s+/g, " ").trim()).filter((b) => b.length > 1);
  const merged: string[] = [];
  let buffer = "";
  for (const line of cleaned) {
    const next = buffer ? `${buffer} ${line}` : line;
    const endsSentence = /[.!?:]$/.test(line) || line.length > 90;
    const startsLower = /^[a-z]/.test(line);
    if (buffer && startsLower) {
      buffer = next;
    } else if (!endsSentence && line.length < 60) {
      buffer = next;
    } else {
      merged.push(next);
      buffer = "";
    }
  }
  if (buffer) merged.push(buffer);
  const seen = new Set<string>();
  return merged.filter((m) => {
    const key = m.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return m.length > 0;
  });
}

function diagramBlock(b: unknown): { caption: string; nodes: string[] } | null {
  if (!b || typeof b !== "object") return null;
  const bb = b as Record<string, unknown>;
  const nodes = Array.isArray(bb.nodes)
    ? bb.nodes.map((n) => String(n).trim()).filter(Boolean).slice(0, 5)
    : [];
  const caption = String(bb.caption ?? "").trim();
  if (nodes.length < 2) return null;
  return { caption, nodes };
}

function normalizeScene(raw: unknown): LearningScene | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const concept = String(r.concept ?? r.title ?? "").trim();
  const intro = String(r.intro ?? "").trim();
  const takeaway = String(r.takeaway ?? "").trim();
  if (!concept || !intro || !takeaway) return null;
  const narration = (r.narration ?? {}) as Record<string, unknown>;
  return {
    concept,
    intro,
    analogy: diagramBlock(r.analogy),
    example: diagramBlock(r.example),
    technical: diagramBlock(r.technical),
    takeaway,
    narration: {
      intro: String(narration.intro ?? "").trim() || intro,
      analogy: narration.analogy ? String(narration.analogy).trim() : undefined,
      example: narration.example ? String(narration.example).trim() : undefined,
      technical: narration.technical ? String(narration.technical).trim() : undefined,
      takeaway: String(narration.takeaway ?? "").trim() || takeaway,
    },
    keywords: Array.isArray(r.keywords)
      ? r.keywords.slice(0, 3).map((k) => String(k).toLowerCase())
      : [],
  };
}

/** Strict quality gate. Returns reason if invalid, else null. */
function sceneQualityIssue(scene: LearningScene): string | null {
  if (!scene.analogy && !scene.example) return "missing analogy AND example diagrams";
  if (!scene.technical) return "missing technical pipeline diagram";
  const n = scene.narration;
  const phases = [n.analogy, n.example, n.technical].filter(Boolean).length;
  if (phases < 2) return "narration must cover at least 2 of analogy/example/technical phases";
  if (scene.concept.length > 60) return "concept name too long (must be 1-3 words)";
  if (scene.intro.split(/\s+/).length < 5) return "intro too short";
  return null;
}

async function generateScenesForSingleSlide(opts: {
  slide: { title: string; bullets: string[] };
  courseTitle: string;
  courseId: string | null;
  cfg: CourseCfg;
  template: string;
  hint?: string;
  userId?: string;
  logKind: string;
}): Promise<{ scenes: LearningScene[]; modelUsed: ModelUsed; attempts: number }> {
  const bullets = repairBullets(opts.slide.bullets);
  const deckOutline = `Slide 1: ${opts.slide.title}\n${bullets.map((b) => `  - ${b}`).join("\n")}`;
  const basePrompt = renderTemplate(opts.template, {
    title: opts.courseTitle,
    courseTitle: opts.courseTitle,
    tone: opts.cfg.tone,
    audience: opts.cfg.audience,
    depth: opts.cfg.tech_depth,
    slideCount: 1,
    deck: deckOutline,
  });
  const withHint = opts.hint?.trim()
    ? `${basePrompt}\n\nEXTRA INSTRUCTION FOR THIS SLIDE: ${opts.hint.trim()}`
    : basePrompt;

  let lastErr = "";
  let modelUsed: ModelUsed = "gemini-3.1-pro";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = attempt === 1
      ? withHint
      : `${withHint}\n\nIMPORTANT: previous attempt failed validation (${lastErr}). Every scene MUST include both an analogy diagram AND a technical pipeline diagram (2-5 nodes each), with multi-phase narration covering analogy, example AND technical phases. One concept per scene.`;
    const { text, modelUsed: m } = await generateJson(prompt, {
      userId: opts.userId,
      courseId: opts.courseId,
      kind: opts.logKind,
      slideCount: 1,
    });
    modelUsed = m;
    try {
      const parsed = extractJson<any>(text);
      let rawScenes: any[] = [];
      if (Array.isArray(parsed)) {
        rawScenes = parsed;
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.scenes)) rawScenes = parsed.scenes;
        else if (Array.isArray(parsed.slides)) rawScenes = parsed.slides[0]?.scenes ?? [];
        else if (parsed.slides && typeof parsed.slides === "object" && Array.isArray(parsed.slides.scenes)) rawScenes = parsed.slides.scenes;
      }
      const scenes = rawScenes.map(normalizeScene).filter((s): s is LearningScene => !!s);
      if (scenes.length === 0) {
        lastErr = "no valid scenes parsed";
        continue;
      }
      const issues = scenes.map(sceneQualityIssue).filter(Boolean) as string[];
      if (issues.length > 0) {
        lastErr = issues[0];
        continue;
      }
      return { scenes, modelUsed, attempts: attempt };
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  throw new Error(`Scene generation failed after 2 attempts: ${lastErr}`);
}

export const generateNarrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const cfg = await loadCourseCfg(data.courseId);
    const template = sceneTemplateFrom(cfg.prompt_override?.trim() || (await loadGlobalTemplate()));

    const slidesOut: SlideScenes[] = [];
    const narrations: string[] = [];
    const keywords: string[][] = [];
    let modelUsed: ModelUsed = "gemini-3.1-pro";
    const failures: { idx: number; error: string }[] = [];

    // Per-slide sequential generation. ONE slide per Gemini call.
    for (let i = 0; i < data.slides.length; i++) {
      const src = data.slides[i];
      try {
        const r = await generateScenesForSingleSlide({
          slide: src,
          courseTitle: data.courseTitle,
          courseId: data.courseId ?? null,
          cfg,
          template,
          userId: context.userId,
          logKind: "scene-generation",
        });
        modelUsed = r.modelUsed;
        slidesOut.push({ sourceSlideIdx: i, scenes: r.scenes });
        narrations.push(r.scenes.map(sceneNarrationToText).join("  "));
        keywords.push(Array.from(new Set(r.scenes.flatMap((sc) => sc.keywords ?? []))).slice(0, 3));
      } catch (e) {
        failures.push({ idx: i, error: (e as Error).message });
        slidesOut.push({ sourceSlideIdx: i, scenes: [] });
        narrations.push("");
        keywords.push([]);
      }
    }

    return { narrations, keywords, scenes: slidesOut, modelUsed, failures };
  });

export const generateCourseDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DescriptionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const deckOutline = data.slides
      .slice(0, 18)
      .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.bullets.slice(0, 5).map((b) => `  - ${b}`).join("\n")}`)
      .join("\n\n");

    const prompt = `Write a concise learner-facing course description for "${data.courseTitle}" based on this uploaded deck.
Keep it specific, practical and business-ready. 35-55 words. No markdown, no preamble.

Return STRICT JSON: { "description": "..." }

DECK:
${deckOutline}`;

    const { text, modelUsed } = await generateJson(prompt, {
      userId: context.userId,
      kind: "description",
      slideCount: data.slides.length,
    });
    const parsed = extractJson<{ description?: string }>(text);
    const description = (parsed.description ?? "").trim();
    if (!description) throw new Error("AI did not return a description");
    return { description, modelUsed };
  });

/* ---- Regenerate a single slide's scenes with optional hint ---- */
const RegenInput = z.object({
  slideId: z.string(),
  hint: z.string().optional(),
});

export const regenerateSlideNarration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RegenInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stripScenes, embedScenes } = await import("@/lib/learningScenes");
    const { data: slide, error } = await supabaseAdmin
      .from("slides")
      .select("id, course_id, idx, title, body_md, generation_hint")
      .eq("id", data.slideId)
      .single();
    if (error || !slide) throw new Error("Slide not found");

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title")
      .eq("id", slide.course_id)
      .single();

    const cleanBody = stripScenes(slide.body_md as string | null);
    const bullets = cleanBody
      .split("\n")
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

    const cfg = await loadCourseCfg(slide.course_id as string);
    const template = sceneTemplateFrom(cfg.prompt_override?.trim() || (await loadGlobalTemplate()));
    const hint = (data.hint ?? slide.generation_hint ?? "").trim() || undefined;

    if (data.hint !== undefined) {
      await supabaseAdmin.from("slides").update({ generation_hint: data.hint || null }).eq("id", data.slideId);
    }

    const r = await generateScenesForSingleSlide({
      slide: { title: slide.title as string, bullets },
      courseTitle: course?.title ?? "this training",
      courseId: slide.course_id as string,
      cfg,
      template,
      hint,
      userId: context.userId,
      logKind: "scene-regenerate",
    });

    const narration = r.scenes.map(sceneNarrationToText).join("  ");
    const kws = Array.from(new Set(r.scenes.flatMap((s) => s.keywords ?? []))).slice(0, 3);
    const newBody = embedScenes(cleanBody, r.scenes);

    await supabaseAdmin
      .from("slides")
      .update({ narration_text: narration, icon_keywords: kws, body_md: newBody })
      .eq("id", data.slideId);

    return { narration, keywords: kws, scenes: r.scenes, sceneCount: r.scenes.length, modelUsed: r.modelUsed, attempts: r.attempts };
  });

/* ---- Regenerate a contiguous slide range, one slide per Gemini call ---- */
const RangeInput = z.object({
  courseId: z.string(),
  startIdx: z.number().int().min(0),
  endIdx: z.number().int().min(0),
});

export type SlideRangeResult = {
  slideId: string;
  idx: number;
  title: string;
  ok: boolean;
  sceneCount: number;
  attempts: number;
  modelUsed?: ModelUsed;
  error?: string;
};

export const regenerateSlideRange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stripScenes, embedScenes } = await import("@/lib/learningScenes");

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title")
      .eq("id", data.courseId)
      .single();

    const { data: slides, error } = await supabaseAdmin
      .from("slides")
      .select("id, idx, title, body_md, generation_hint")
      .eq("course_id", data.courseId)
      .gte("idx", data.startIdx)
      .lte("idx", data.endIdx)
      .order("idx");
    if (error || !slides) throw new Error("Slides not found");

    const cfg = await loadCourseCfg(data.courseId);
    const template = sceneTemplateFrom(cfg.prompt_override?.trim() || (await loadGlobalTemplate()));
    const results: SlideRangeResult[] = [];

    for (const slide of slides) {
      const cleanBody = stripScenes(slide.body_md as string | null);
      const bullets = cleanBody
        .split("\n")
        .map((l) => l.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
      try {
        const r = await generateScenesForSingleSlide({
          slide: { title: slide.title as string, bullets },
          courseTitle: course?.title ?? "this training",
          courseId: data.courseId,
          cfg,
          template,
          hint: (slide.generation_hint as string | null) ?? undefined,
          userId: context.userId,
          logKind: "scene-range",
        });
        const narration = r.scenes.map(sceneNarrationToText).join("  ");
        const kws = Array.from(new Set(r.scenes.flatMap((s) => s.keywords ?? []))).slice(0, 3);
        const newBody = embedScenes(cleanBody, r.scenes);
        await supabaseAdmin
          .from("slides")
          .update({ narration_text: narration, icon_keywords: kws, body_md: newBody })
          .eq("id", slide.id);
        results.push({
          slideId: slide.id as string,
          idx: slide.idx as number,
          title: slide.title as string,
          ok: true,
          sceneCount: r.scenes.length,
          attempts: r.attempts,
          modelUsed: r.modelUsed,
        });
      } catch (e) {
        results.push({
          slideId: slide.id as string,
          idx: slide.idx as number,
          title: slide.title as string,
          ok: false,
          sceneCount: 0,
          attempts: 2,
          error: (e as Error).message,
        });
      }
    }
    return { results };
  });

/* ---- Per-slide illustration generation (opt-in) ---- */
const IllustrationInput = z.object({ slideIds: z.array(z.string()).min(1).max(20) });

export const generateSlideIllustrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IllustrationInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: slides, error } = await supabaseAdmin
      .from("slides")
      .select("id, course_id, title, body_md, generation_hint")
      .in("id", data.slideIds);
    if (error || !slides) throw new Error("Slides not found");

    const results: Array<{ slideId: string; url: string | null; error?: string }> = [];
    for (const s of slides) {
      try {
        const bullets = String(s.body_md ?? "")
          .split("\n")
          .map((l) => l.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 4)
          .join(", ");
        const hint = s.generation_hint ? ` Visual hint: ${s.generation_hint}.` : "";
        const prompt = `Flat editorial vector illustration, soft pastel palette, clean shapes, no text, no logos, centered subject on a light background. Concept: ${s.title}. ${bullets}.${hint}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!res.ok) throw new Error(`image gen ${res.status}`);
        const json = (await res.json()) as {
          choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
        };
        const dataUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!dataUrl) throw new Error("No image returned");

        const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (!m) throw new Error("Bad image data URL");
        const mime = m[1];
        const ext = mime.split("/")[1] || "png";
        const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
        const path = `${s.course_id}/illustrations/${s.id}-${Date.now()}.${ext}`;
        const up = await supabaseAdmin.storage.from("course-uploads").upload(path, bytes, {
          contentType: mime,
          upsert: true,
        });
        if (up.error) throw up.error;
        await supabaseAdmin.from("slides").update({ illustration_url: path }).eq("id", s.id);
        results.push({ slideId: s.id, url: path });
      } catch (e) {
        results.push({ slideId: s.id, url: null, error: (e as Error).message });
      }
    }
    return { results };
  });

/* ---- Admin settings: prompt template + Gemini key status ---- */
export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("prompt_templates")
      .select("template, updated_at")
      .eq("scope", "global")
      .maybeSingle();
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    return {
      template: (data?.template as string) || DEFAULT_TEMPLATE,
      defaultTemplate: DEFAULT_TEMPLATE,
      updatedAt: (data?.updated_at as string) || null,
      hasGeminiKey,
      narrationModel: hasGeminiKey ? MODEL_LABEL["gemini-3.1-pro"] : MODEL_LABEL["gemini-flash-fallback"],
      tts: {
        provider: "Yavar TTS (self-hosted)",
        endpoint: "wss://agentic-rag.yavar.ai/stream/tts",
        voice: "af_heart",
        sampleRate: 24000,
      },
    };
  });

export const getRecentGenerationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("generation_logs")
      .select("id, created_at, kind, model, provider, status, detail, slide_count, duration_ms, course_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return { logs: data ?? [] };
  });

const SaveTemplateInput = z.object({ template: z.string().min(20).max(20000) });

export const saveGlobalTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveTemplateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("prompt_templates")
      .upsert({ scope: "global", template: data.template, updated_at: new Date().toISOString() }, { onConflict: "scope" });
    if (error) throw error;
    return { ok: true };
  });
