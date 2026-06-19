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

const QuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        answerIndex: z.number().min(0).max(3),
        explanation: z.string(),
        topic: z.string(),
      }),
    )
    .length(20),
});

export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: async () => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const seed = Math.floor(Math.random() * 1e9);
        const gateway = createLovableAiGatewayProvider(key);

        const { object } = await generateObject({
          model: gateway("google/gemini-3-flash-preview"),
          schema: QuizSchema,
          system: `You are a quiz generator for the course "Enterprise AI with Private LLM – Technical & Presales Deep Dive". Generate exactly 20 multiple-choice questions grounded in the provided training material. Cover a balanced mix across: private LLMs vs SaaS, SLMs, embeddings, vector DBs, RAG, agentic AI, runtimes (vLLM/TGI/Ollama/llama.cpp), model families (Llama, Qwen, Gemma, Mistral, DeepSeek, Kimi, Gemini), GPUs (H100/H200/L40S/A100/MI300X), quantization, fine-tuning (LoRA/QLoRA), TCO/ROI, security/compliance, and presales positioning. Each question must have 4 options with exactly ONE correct answer. Vary the position of the correct answer. Keep questions crisp, unambiguous, and technical. Include a one-sentence explanation. Randomization seed: ${seed}.`,
          prompt: `Use this training material as the source of truth:\n\n=== MATERIAL ===\n${CORPUS}\n=== END ===\n\nGenerate 20 fresh quiz questions now. Avoid repetition. Randomize topic order.`,
          temperature: 0.9,
        });

        return new Response(JSON.stringify(object), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
