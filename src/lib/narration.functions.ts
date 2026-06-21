import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

const DEFAULT_TEMPLATE = `You are scripting voice-over narration for an interactive training course titled "{{courseTitle}}".
Tone: {{tone}}. Audience: {{audience}}. Technical depth (1=simple, 5=expert): {{depth}}.

Write a SHORT, conversational narration for EACH slide below. 40-70 words per slide. Speak directly to the learner ("you"). Paraphrase, add context, give a real-world hook. Never read bullets verbatim. No markdown, no slide numbers, no preamble.

Also extract 1-3 concrete keywords per slide (single words, lowercase nouns) that capture the visual concept.

Return STRICT JSON: { "narrations": ["...slide 1...", ...], "keywords": [["k1","k2"], ...] } with exactly {{slideCount}} entries in each array.

DECK:
{{deck}}`;

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
            generationConfig: { temperature: 0.55, maxOutputTokens: 8192, responseMimeType: "application/json" },
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
      temperature: 0.6,
    });
    await writeLog(ctx, modelUsed, "ok", null, Date.now() - started);
    return { text, modelUsed };
  } catch (e) {
    await writeLog(ctx, modelUsed, "error", (e as Error).message, Date.now() - started);
    throw e;
  }
}

function extractJson<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI did not return JSON");
  return JSON.parse(m[0]) as T;
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
    const template = cfg.prompt_override?.trim() || (await loadGlobalTemplate());
    const deckOutline = data.slides
      .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.bullets.map((b) => `  - ${b}`).join("\n")}`)
      .join("\n\n");
    const prompt = renderTemplate(template, {
      title: data.courseTitle,
      courseTitle: data.courseTitle,
      tone: cfg.tone,
      audience: cfg.audience,
      depth: cfg.tech_depth,
      slideCount: data.slides.length,
      deck: deckOutline,
    });

    const { text, modelUsed } = await generateJson(prompt, {
      userId: context.userId,
      courseId: data.courseId ?? null,
      kind: "narrations",
      slideCount: data.slides.length,
    });
    const parsed = extractJson<{ narrations: string[]; keywords?: string[][] }>(text);
    if (!Array.isArray(parsed.narrations)) throw new Error("Bad AI response shape");
    const narrations = data.slides.map((_, i) => (parsed.narrations[i] ?? "").trim());
    const keywords = data.slides.map((_, i) =>
      Array.isArray(parsed.keywords?.[i]) ? parsed.keywords![i].slice(0, 3).map((k) => String(k).toLowerCase()) : [],
    );
    return { narrations, keywords, modelUsed };
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

/* ---- Regenerate a single slide's narration with optional hint ---- */
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

    const bullets = String(slide.body_md ?? "")
      .split("\n")
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

    const cfg = await loadCourseCfg(slide.course_id as string);
    const template = cfg.prompt_override?.trim() || (await loadGlobalTemplate());
    const deckOutline = `Slide 1: ${slide.title}\n${bullets.map((b) => `  - ${b}`).join("\n")}`;
    let prompt = renderTemplate(template, {
      title: course?.title ?? "this training",
      courseTitle: course?.title ?? "this training",
      tone: cfg.tone,
      audience: cfg.audience,
      depth: cfg.tech_depth,
      slideCount: 1,
      deck: deckOutline,
    });

    const hint = (data.hint ?? slide.generation_hint ?? "").trim();
    if (hint) prompt += `\n\nEXTRA INSTRUCTION FOR THIS SLIDE: ${hint}`;

    // Save hint if provided
    if (data.hint !== undefined) {
      await supabaseAdmin.from("slides").update({ generation_hint: data.hint || null }).eq("id", data.slideId);
    }

    const { text, modelUsed } = await generateJson(prompt, {
      userId: context.userId,
      courseId: slide.course_id as string,
      kind: "slide-regenerate",
      slideCount: 1,
    });
    const parsed = extractJson<{ narrations: string[]; keywords?: string[][] }>(text);
    const narration = (parsed.narrations?.[0] ?? "").trim();
    const keywords = Array.isArray(parsed.keywords?.[0])
      ? parsed.keywords![0].slice(0, 3).map((k) => String(k).toLowerCase())
      : [];
    if (!narration) throw new Error("AI returned empty narration");

    await supabaseAdmin
      .from("slides")
      .update({ narration_text: narration, icon_keywords: keywords })
      .eq("id", data.slideId);

    return { narration, keywords, modelUsed };
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

        // dataUrl is like data:image/png;base64,XXXX
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
