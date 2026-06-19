import { createFileRoute } from "@tanstack/react-router";

const VOICE_INSTRUCTIONS = `You are Ari, a warm, engaging enterprise-AI training coach.
Speak with genuine empathy and energy — like an inspiring teacher who actually cares.
Vary pitch, pace, and emphasis. Stress key technical terms (LLM, RAG, embeddings, vector DB, GPU model names) with confidence.
Use natural micro-pauses after commas and before "but", "however", "and that means".
Sound conversational, never monotone. Light enthusiasm on insights, calmer on definitions.
Pronounce acronyms clearly: L-L-M, S-L-M, R-A-G, T-C-O, G-P-U, A-P-I.`;

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: { text?: string; voice?: string };
        try {
          body = (await request.json()) as { text?: string; voice?: string };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const text = (body.text ?? "").toString().trim();
        if (!text) return new Response("Missing text", { status: 400 });
        if (text.length > 4000) return new Response("Text too long", { status: 400 });

        const voice = body.voice ?? "shimmer"; // warm, expressive female voice

        try {
          const response = await fetch(
            "https://ai.gateway.lovable.dev/v1/audio/speech",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "openai/gpt-4o-mini-tts",
                input: text,
                voice,
                instructions: VOICE_INSTRUCTIONS,
                stream_format: "sse",
                response_format: "pcm",
              }),
              signal: request.signal,
            },
          );

          if (!response.ok) {
            const errText = await response.text().catch(() => "");
            return new Response(errText || `TTS failed: ${response.status}`, {
              status: response.status,
            });
          }

          return new Response(response.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          console.error("[/api/tts] error:", err);
          return new Response("TTS error", { status: 500 });
        }
      },
    },
  },
});
