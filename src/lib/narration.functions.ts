import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SlideIn = z.object({
  title: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

const Input = z.object({
  courseTitle: z.string().default("this training"),
  slides: z.array(SlideIn).min(1).max(80),
});

const DescriptionInput = z.object({
  courseTitle: z.string().default("this training"),
  slides: z.array(SlideIn).min(1).max(80),
});

/**
 * Generates conversational narration text (~40-70 words) for each slide.
 * Returns one string per slide in the same order.
 */
export const generateNarrations = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const deckOutline = data.slides
      .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.bullets.map((b) => `  • ${b}`).join("\n")}`)
      .join("\n\n");

    const prompt = `You are scripting voice-over narration for an interactive training course titled "${data.courseTitle}".
Write a SHORT, conversational narration for EACH slide below. 40–70 words per slide. Speak directly to the learner ("you"). Connect ideas slide-to-slide. Avoid reading bullets verbatim — paraphrase and add context. No markdown, no slide numbers, no preamble.

Return STRICT JSON: { "narrations": ["...slide 1...", "...slide 2...", ...] } with exactly ${data.slides.length} entries.

DECK:
${deckOutline}`;

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.6,
    });

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return JSON");
    const parsed = JSON.parse(jsonMatch[0]) as { narrations: string[] };
    if (!Array.isArray(parsed.narrations)) throw new Error("Bad AI response shape");
    // Pad/trim to exact length
    const out = data.slides.map((_, i) => (parsed.narrations[i] ?? "").trim());
    return { narrations: out };
  });

export const generateCourseDescription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DescriptionInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const deckOutline = data.slides
      .slice(0, 18)
      .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.bullets.slice(0, 5).map((b) => `  • ${b}`).join("\n")}`)
      .join("\n\n");

    const prompt = `Write a concise learner-facing course description for "${data.courseTitle}" based on this uploaded deck.
Keep it specific, practical and business-ready. 35-55 words. No markdown, no preamble.

Return STRICT JSON: { "description": "..." }

DECK:
${deckOutline}`;

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.45,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return JSON");
    const parsed = JSON.parse(jsonMatch[0]) as { description?: string };
    const description = (parsed.description ?? "").trim();
    if (!description) throw new Error("AI did not return a description");
    return { description };
  });
