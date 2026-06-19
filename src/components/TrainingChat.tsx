import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  { icon: "🧠", text: "LLM vs SLM — when do I pick which?" },
  { icon: "🔎", text: "RAG vs fine-tuning — decision rules" },
  { icon: "🗄️", text: "Pinecone vs Weaviate vs pgvector" },
  { icon: "💰", text: "Pitch private LLM ROI to a CFO" },
  { icon: "⚙️", text: "vLLM vs Ollama vs TGI for serving" },
];

export function TrainingChat({ currentSlide }: { currentSlide?: number }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const transport = useRef(new DefaultChatTransport({ api: "/api/chat" })).current;
  const { messages, sendMessage, setMessages, status, error, stop } = useChat({ transport });
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (open) setTimeout(() => taRef.current?.focus(), 50);
  }, [open]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const prefix = currentSlide ? `(I'm currently on slide ${currentSlide}.) ` : "";
    void sendMessage({ text: prefix + t });
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const renderText = (m: UIMessage) =>
    m.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("");

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-4 py-3 text-slate-900 shadow-[0_10px_40px_-8px_rgba(251,191,36,0.6)] ring-1 ring-amber-200/50 transition hover:scale-[1.03] active:scale-95"
        aria-label="Ask Ava"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 text-base">
          {open ? "✕" : "✨"}
          {!open && (
            <span className="absolute inset-0 animate-ping rounded-full bg-amber-300/40" />
          )}
        </span>
        <span className="text-sm font-semibold tracking-tight">
          {open ? "Close" : "Ask Ava"}
        </span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[640px] w-[440px] max-w-[94vw] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <header className="relative overflow-hidden border-b border-white/10 px-5 py-4">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/25 via-orange-500/10 to-transparent" />
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-lg shadow-inner">
                🤖
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-100">Ava</span>
                  <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                    Online
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Private LLM coach · grounded in your deck
                </div>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-white/10 hover:text-slate-100"
                  title="Clear chat"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm [scrollbar-width:thin]"
          >
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
                  <p className="text-slate-200">
                    Hey! I'm <span className="font-semibold text-amber-300">Ava</span>. 
                    Ask me anything about the course — and I'll also pull in relevant
                    industry context (model families, vector DBs, serving stacks, GPU
                    economics) when it helps.
                  </p>
                  {currentSlide && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      I know you're on <b>Slide {currentSlide}</b> — I'll keep that in mind.
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Try asking
                  </div>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => submit(s.text)}
                        className="group flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-[12.5px] text-slate-200 transition hover:border-amber-400/40 hover:bg-amber-500/10"
                      >
                        <span className="text-base">{s.icon}</span>
                        <span className="flex-1">{s.text}</span>
                        <span className="text-amber-400 opacity-0 transition group-hover:opacity-100">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.role === "user";
              const text = renderText(m);
              return (
                <div key={m.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-xs">
                      🤖
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                      isUser
                        ? "rounded-br-md bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900"
                        : "rounded-bl-md border border-white/10 bg-white/[0.06] text-slate-100"
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{text}</div>
                    ) : (
                      <div className="space-y-1.5 text-[13px] leading-relaxed [&_p]:my-0 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-amber-200 [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-amber-200 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-2 [&_h1]:mt-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_a]:text-amber-300 [&_a]:underline [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/5 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {status === "submitted" && (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-xs">
                  🤖
                </div>
                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:240ms]" />
                    <span className="ml-2 text-[11px] text-slate-400">Ava is thinking…</span>
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[12px] text-red-200">
                {error.message || "Something went wrong. Please try again."}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="border-t border-white/10 bg-slate-950/80 p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-amber-400/50 focus-within:bg-white/[0.07] transition">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 140) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                rows={1}
                placeholder="Ask about RAG, agents, vector DBs, GPUs…"
                className="max-h-[140px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700 text-slate-100 hover:bg-slate-600"
                  aria-label="Stop"
                >
                  ◼
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 shadow-sm transition disabled:opacity-40 hover:brightness-110"
                  aria-label="Send"
                >
                  ➤
                </button>
              )}
            </div>
            <div className="mt-1.5 px-1 text-[10px] text-slate-500">
              Grounded in your deck · enriched with industry context · Enter to send · Shift+Enter for newline
            </div>
          </form>
        </div>
      )}
    </>
  );
}
