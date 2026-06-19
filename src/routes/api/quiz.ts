import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { generateObject } from "ai";
import { z } from "zod";
import slidesData from "@/assets/training/slides.json";

type Slide = { i: number; title: string; notes: string };
const SLIDES = slidesData as Slide[];

const CORPUS = SLIDES.map(
  (s) => `### Slide ${s.i}: ${s.title}\n${s.notes}`,
).join("\n\n");

// Lenient schema — accept whatever the model produces, validate post-hoc.
const RawQuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(2),
        answer: z.string(),
        explanation: z.string().optional().default(""),
        topic: z.string().optional().default("General"),
      }),
    )
    .min(1),
});

export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: async () => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const seed = Math.floor(Math.random() * 1e9);
        const gateway = createLovableAiGatewayProvider(key);

        const models = [
          "google/gemini-2.5-flash",
          "google/gemini-3-flash-preview",
          "openai/gpt-5-mini",
        ];

        const system = `You are a quiz generator for "Enterprise AI with Private LLM – Technical & Presales Deep Dive". Generate exactly 20 multiple-choice questions grounded in the provided training material. Cover a balanced mix across: private LLMs vs SaaS, SLMs, embeddings, vector DBs, RAG, agentic AI, runtimes (vLLM/TGI/Ollama/llama.cpp), model families (Llama, Qwen, Gemma, Mistral, DeepSeek, Kimi, Gemini), GPUs (H100/H200/L40S/A100/MI300X), quantization, fine-tuning (LoRA/QLoRA), TCO/ROI, security/compliance, presales positioning. Each question has exactly 4 options with ONE correct answer. The "answer" MUST be the verbatim string of the correct option (exactly matching one entry in "options" — no "A)" prefixes). Include a one-sentence "explanation" and a short "topic" tag. Vary the position of the correct option. Seed: ${seed}.`;
        const prompt = `Use this training material as the source of truth:\n\n=== MATERIAL ===\n${CORPUS}\n=== END ===\n\nReturn JSON: { "questions": [ { question, options[4], answer, explanation, topic }, ... ] }. Generate 20 fresh questions now.`;

        let lastErr: unknown = null;
        for (const modelId of models) {
          try {
            const { object } = await generateObject({
              model: gateway(modelId),
              schema: RawQuizSchema,
              system,
              prompt,
              temperature: 0.9,
            });

            const stripPrefix = (s: string) =>
              s.replace(/^\s*[A-Da-d][\).\:\-]\s*/, "").trim().toLowerCase();

            const questions = object.questions
              .map((q) => {
                const target = stripPrefix(q.answer);
                let idx = q.options.findIndex((o) => stripPrefix(o) === target);
                if (idx === -1) {
                  const letter = q.answer.trim().toUpperCase();
                  if (/^[A-D]$/.test(letter)) idx = letter.charCodeAt(0) - 65;
                }
                if (idx < 0 || idx >= q.options.length) return null;
                return {
                  question: q.question,
                  options: q.options,
                  answerIndex: idx,
                  explanation: q.explanation || "",
                  topic: q.topic || "General",
                };
              })
              .filter((q): q is NonNullable<typeof q> => q !== null)
              .slice(0, 20);

            if (questions.length >= 10) {
              return new Response(JSON.stringify({ questions }), {
                headers: { "content-type": "application/json" },
              });
            }
            lastErr = new Error(`Only ${questions.length} valid questions from ${modelId}`);
          } catch (e) {
            lastErr = e;
            console.warn(`[/api/quiz] ${modelId} failed:`, (e as Error)?.message ?? e);
          }
        }

        console.error("[/api/quiz] all models failed:", lastErr);
        return new Response(
          JSON.stringify({ error: "Quiz generation failed. Please try again." }),
          { status: 502, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
