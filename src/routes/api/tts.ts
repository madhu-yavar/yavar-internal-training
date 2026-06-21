import { createFileRoute } from "@tanstack/react-router";

// Streams PCM audio (SSE) from Lovable AI Gateway TTS.
// Body: { text: string, voice?: string, speed?: number }
// Response: text/event-stream with `speech.audio.delta` (base64 PCM 24kHz mono int16 LE)
//           and `speech.audio.done` events.
export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }
        let body: { text?: string; voice?: string; speed?: number };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const text = (body.text ?? "").toString().trim();
        if (!text) return new Response("Missing text", { status: 400 });
        const voice = body.voice || "alloy";
        const speed = typeof body.speed === "number" && body.speed > 0 ? body.speed : 1;

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input: text,
              voice,
              speed,
              stream_format: "sse",
              response_format: "pcm",
            }),
            signal: request.signal,
          });

          if (!upstream.ok || !upstream.body) {
            const msg = await upstream.text().catch(() => "");
            return new Response(
              JSON.stringify({ error: msg || `TTS failed (${upstream.status})`, status: upstream.status }),
              { status: upstream.status === 402 || upstream.status === 429 ? upstream.status : 502, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(upstream.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
            },
          });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          return new Response(
            JSON.stringify({ error: (err as Error).message || "TTS error" }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
