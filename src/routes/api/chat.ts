import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import slidesData from "@/assets/training/slides.json";

type Slide = { i: number; title: string; notes: string };
const SLIDES = slidesData as Slide[];

const CORPUS = SLIDES.map(
  (s) => `### Slide ${s.i}: ${s.title}\n${s.notes}`,
).join("\n\n");

const SYSTEM = `You are "Ava", a presales & solution-architecture training assistant for the course "Enterprise AI with Private LLM – Technical & Presales Deep Dive".

Answer learner questions strictly using the training material below. If something is not covered, say so briefly and give the closest related guidance from the material. Be concise, technical, and practical. Use markdown with short bullets when helpful. When relevant, mention concrete products (e.g. Llama 3.3, Qwen 2.5, Gemma 2, Mistral, Phi-3, vLLM, TGI, Ollama, Pinecone, Weaviate, Milvus, pgvector, LangGraph, LlamaIndex, Haystack) and cite the slide number like (Slide 7).

=== TRAINING MATERIAL ===
${CORPUS}
=== END MATERIAL ===`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
