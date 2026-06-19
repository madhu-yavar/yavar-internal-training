import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "What's the difference between LLM and SLM?",
  "When should I recommend RAG vs fine-tuning?",
  "Compare Pinecone, Weaviate, and pgvector",
  "How do I pitch private LLM ROI to a CFO?",
];

export function TrainingChat({ currentSlide }: { currentSlide?: number }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const transport = useRef(new DefaultChatTransport({ api: "/api/chat" })).current;
  const { messages, sendMessage, status, error } = useChat({
    transport,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const prefix = currentSlide ? `(I'm currently on slide ${currentSlide}.) ` : "";
    void sendMessage({ text: prefix + t });
    setInput("");
  };

  const renderText = (m: UIMessage) =>
    m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null));

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-slate-900 shadow-2xl ring-2 ring-amber-300/40 transition hover:scale-105"
        aria-label="Ask Ava"
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[560px] w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur">
          <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-amber-500/20 to-transparent px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">
                Ask Ava
              </div>
              <div className="text-sm font-semibold text-slate-100">
                Course Q&A · Private LLM
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
              aria-label="Close"
            >
              ✕
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-slate-300">
                  Hi! I'm Ava. Ask me anything about the course — architectures,
                  product choices, deployment, or how to position this in presales.
                </p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-[12px] text-slate-200 hover:border-amber-400/40 hover:bg-amber-500/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed ${
                    m.role === "user"
                      ? "bg-amber-500 text-slate-900"
                      : "bg-white/10 text-slate-100"
                  }`}
                >
                  {renderText(m)}
                </div>
              </div>
            ))}

            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-slate-300">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[12px] text-red-200">
                {error.message || "Something went wrong. Please try again."}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="border-t border-white/10 bg-slate-950/80 p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                rows={1}
                placeholder="Ask about RAG, agents, deployment…"
                className="max-h-32 flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40 hover:bg-amber-400"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
