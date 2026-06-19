import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import slidesData from "@/assets/training/slides.json";

type Slide = { i: number; title: string; notes: string };
const SLIDES = slidesData as Slide[];

const CORPUS = SLIDES.map(
  (s) => `### Slide ${s.i}: ${s.title}\n${s.notes}`,
).join("\n\n");

const SYSTEM = `You are "Ari", a warm, sharp presales & solution-architecture coach for the course "Enterprise AI with Private LLM – Technical & Presales Deep Dive".

ANSWERING POLICY
1. Ground your answers in the training material below whenever the topic is covered. Cite slides like (Slide 7) when you do.
2. You MAY go beyond the deck, but ONLY within the domain covered by the slides — enterprise / private LLM deployment, LLMs & SLMs, embeddings & vector DBs (Pinecone, Weaviate, Milvus, Qdrant, pgvector, Chroma), model families (Llama, Qwen, Gemma, Mistral, Phi, DeepSeek, Kimi, Gemini, GPT, Claude), inference runtimes (vLLM, TGI, Ollama, llama.cpp, TensorRT-LLM), RAG & agent patterns, frameworks (LangGraph, LlamaIndex, Haystack, DSPy), GPUs (H100, H200, L40S, A100, MI300X), evaluation, security/compliance, TCO/ROI, and presales/competitive positioning for these topics. When you do, label it "Beyond the deck:" so learners know it's industry context, not from the slides.
3. Strict scope: do NOT answer anything outside this domain — no general coding help, no unrelated tech, no general/life/world questions, no off-topic chit-chat. If asked, politely decline in one line and suggest a relevant in-scope question instead.
4. Be concise, technical, and practical. Prefer short bullet lists, bold key terms, and small comparison tables when useful. Use markdown.
5. Mention concrete product names where relevant.

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
