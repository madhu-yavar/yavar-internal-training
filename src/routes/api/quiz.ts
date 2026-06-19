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

// Accept the LLM's natural shape: `answer` is the correct option string.
const RawQuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(3).max(5),
        answer: z.string(),
        explanation: z.string().optional().default(""),
        topic: z.string().optional().default("General"),
      }),
    )
    .min(15),
});

export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: async () => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const seed = Math.floor(Math.random() * 1e9);
        const gateway = createLovableAiGatewayProvider(key);

        try {
          const { object } = await generateObject({
            model: gateway("google/gemini-3-flash-preview"),
            schema: RawQuizSchema,
            system: `You are a quiz generator for the course "Enterprise AI with Private LLM – Technical & Presales Deep Dive". Generate exactly 20 multiple-choice questions grounded in the provided training material. Cover a balanced mix across: private LLMs vs SaaS, SLMs, embeddings, vector DBs, RAG, agentic AI, runtimes (vLLM/TGI/Ollama/llama.cpp), model families (Llama, Qwen, Gemma, Mistral, DeepSeek, Kimi, Gemini), GPUs (H100/H200/L40S/A100/MI300X), quantization, fine-tuning (LoRA/QLoRA), TCO/ROI, security/compliance, and presales positioning. Each question must have exactly 4 options with ONE correct answer. The "answer" field MUST be the verbatim string of the correct option (exactly matching one entry in "options"). Include a one-sentence "explanation" and a short "topic" tag. Vary the position of the correct option. Randomization seed: ${seed}.`,
            prompt: `Use this training material as the source of truth:\n\n=== MATERIAL ===\n${CORPUS}\n=== END ===\n\nGenerate 20 fresh quiz questions now. Avoid repetition. Randomize topic order.`,
            temperature: 0.9,
          });

          // Map answer string -> answerIndex; drop any malformed items.
          const questions = object.questions
            .map((q) => {
              const idx = q.options.findIndex(
                (o) => o.trim().toLowerCase() === q.answer.trim().toLowerCase(),
              );
              if (idx === -1) return null;
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

          if (questions.length < 10) {
            return new Response(
              JSON.stringify({ error: "Quiz generation produced too few valid questions. Please try again." }),
              { status: 502, headers: { "content-type": "application/json" } },
            );
          }

          return new Response(JSON.stringify({ questions }), {
            headers: { "content-type": "application/json" },
          });
        } catch (e: any) {
          console.error("[/api/quiz] generation failed:", e?.message ?? e);
          return new Response(
            JSON.stringify({ error: e?.message ?? "Quiz generation failed" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
