import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
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
2. You MAY go beyond the deck for ANY topic that falls within the broader domain of enterprise AI / private LLMs — even if the specific concept isn't in the slides. Examples of in-domain topics you should answer fully using your own knowledge: quantization (GPTQ, AWQ, GGUF, INT4/INT8, FP8), LoRA/QLoRA/PEFT fine-tuning, distillation, speculative decoding, KV-cache, context-length extension, MoE, MLA, prompt caching, guardrails, evals (MMLU, MT-Bench, RAGAS), chunking strategies, reranking (Cohere, BGE), hybrid search, observability (Langfuse, Arize, Phoenix), agent frameworks, MCP, function calling, structured outputs, model families (Llama, Qwen, Gemma, Mistral, Phi, DeepSeek, Kimi, Gemini, GPT, Claude), vector DBs (Pinecone, Weaviate, Milvus, Qdrant, pgvector, Chroma), runtimes (vLLM, TGI, Ollama, llama.cpp, TensorRT-LLM, SGLang), GPUs (H100, H200, B200, L40S, A100, MI300X), TCO/ROI, security/compliance (SOC2, HIPAA, GDPR, EU AI Act), presales & competitive positioning. When the topic isn't in the deck, prefix with "Beyond the deck:" so learners know it's industry context.
3. STRICT off-topic rule: if a question is clearly outside enterprise AI / LLMs / data / ML infra (e.g. sports like FIFA, cooking, movies, general coding help unrelated to AI, personal life, world news, math homework, etc.), politely decline in ONE line and suggest a relevant in-scope question. Do not attempt to answer.
4. Be concise, technical, and practical. Prefer short bullet lists, bold key terms, and small comparison tables when useful. Use markdown.
5. Mention concrete product names and version numbers where relevant.

=== TRAINING MATERIAL ===
${CORPUS}
=== END MATERIAL ===`;

type CourseCtx = {
  title?: string;
  slides?: { i: number; title: string; notes: string }[];
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown; course?: CourseCtx };
        const { messages, course } = body;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        // Build the per-course system prompt when a course context is passed in;
        // otherwise fall back to the original Enterprise-AI deck corpus.
        let system = SYSTEM;
        if (course?.slides?.length) {
          const corpus = course.slides
            .map((s) => `### Slide ${s.i}: ${s.title}\n${s.notes}`)
            .join("\n\n");
          system = `You are "Ari", a warm, sharp AI learning coach for the course "${course.title ?? "this course"}".

ANSWERING POLICY
1. Ground your answers in the training material below whenever the topic is covered. Cite slides like (Slide 3) when you do.
2. You MAY go beyond the deck for in-domain context the learner asks about — prefix that with "Beyond the deck:" so it's clear.
3. If a question is clearly outside the course's subject area, politely decline in ONE line and suggest a relevant in-scope question.
4. Be concise, technical, practical. Prefer short bullets, bold key terms, and small tables when helpful. Use markdown.

=== TRAINING MATERIAL ===
${corpus}
=== END MATERIAL ===`;
        }

        const google = createOpenAICompatible({
          name: "google",
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: key,
        });
        const modelMessages = await convertToModelMessages(messages as UIMessage[]);
        const result = streamText({
          model: google("gemini-3.5-flash"),
          system,
          messages: modelMessages,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
