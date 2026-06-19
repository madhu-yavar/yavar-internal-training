import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import slidesData from "@/assets/training/slides.json";
import videoAsset from "@/assets/training.mp4.asset.json";
import { SLIDE_META } from "@/assets/training/slide-meta";
import { AIAvatar } from "@/components/AIAvatar";
import { TrainingChat } from "@/components/TrainingChat";
import { TrainingQuiz } from "@/components/TrainingQuiz";
import { WsTtsPlayer, DEFAULT_TTS_URL } from "@/lib/wsTts";

type Slide = { i: number; title: string; notes: string };
const SLIDES = slidesData as Slide[];

const CHAPTERS = [
  { start: 1, label: "Introduction" },
  { start: 4, label: "Architecture & RAG" },
  { start: 8, label: "Agentic & Ops" },
  { start: 12, label: "Deployment" },
  { start: 16, label: "Presales Playbook" },
];

const ACCENT_BG: Record<string, string> = {
  amber: "from-amber-500/20 to-amber-500/5 border-amber-400/30",
  sky: "from-sky-500/20 to-sky-500/5 border-sky-400/30",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-400/30",
  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-400/30",
  cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-400/30",
  indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-400/30",
  fuchsia: "from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-400/30",
  teal: "from-teal-500/20 to-teal-500/5 border-teal-400/30",
  lime: "from-lime-500/20 to-lime-500/5 border-lime-400/30",
  blue: "from-blue-500/20 to-blue-500/5 border-blue-400/30",
  red: "from-red-500/20 to-red-500/5 border-red-400/30",
  orange: "from-orange-500/20 to-orange-500/5 border-orange-400/30",
  yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-400/30",
  pink: "from-pink-500/20 to-pink-500/5 border-pink-400/30",
  purple: "from-purple-500/20 to-purple-500/5 border-purple-400/30",
};

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Enterprise AI with Private LLM – Training" },
      {
        name: "description",
        content:
          "Interactive presales & solution-architecture training on Private LLMs, RAG, agentic AI, and deployment.",
      },
    ],
  }),
  component: TrainingPage,
});

function TrainingPage() {
  const [idx, setIdx] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const slide = SLIDES[idx];
  const meta = SLIDE_META[slide.i];

  const sentences = useMemo(
    () =>
      (slide.notes || slide.title)
        .replace(/VOICEOVER SCRIPT[^\n]*/gi, "")
        .replace(/Approx\.[^\n]*/gi, "")
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 4),
    [slide],
  );

  // Track which sentence is currently being narrated
  const cursorRef = useRef(0);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const userStartedRef = useRef(false);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [ttsSource, setTtsSource] = useState<"ws" | "browser">("ws");
  const wsPlayerRef = useRef<WsTtsPlayer | null>(null);
  const cancelledRef = useRef(false);

  // Pick a good English voice when available (browser fallback)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTtsSupported(false);
      return;
    }
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /en[-_]?(US|GB)/i.test(v.lang) && /female|samantha|jenny|aria|zira|google us english/i.test(v.name)) ||
        voices.find((v) => /en[-_]?(US|GB)/i.test(v.lang)) ||
        voices[0] ||
        null;
      voiceRef.current = preferred;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  }, []);

  const stopAll = () => {
    cancelledRef.current = true;
    wsPlayerRef.current?.stop();
    wsPlayerRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakBrowser = (text: string) =>
    new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.lang = voiceRef.current?.lang || "en-US";
      u.rate = 1.0;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  const speakOne = async (text: string): Promise<void> => {
    if (ttsSource === "ws") {
      try {
        const player = new WsTtsPlayer({ url: DEFAULT_TTS_URL });
        wsPlayerRef.current = player;
        await player.speak(text);
        return;
      } catch (e) {
        // Fall back to browser TTS for the rest of the session
        console.warn("WS TTS failed, falling back to browser TTS:", e);
        setTtsSource("browser");
      }
    }
    await speakBrowser(text);
  };

  const speakFrom = async (startIndex: number) => {
    cancelledRef.current = false;
    cursorRef.current = startIndex;
    while (cursorRef.current < sentences.length) {
      if (cancelledRef.current) return;
      const i = cursorRef.current;
      setRevealed(i + 1);
      await speakOne(sentences[i]);
      if (cancelledRef.current) return;
      cursorRef.current = i + 1;
      // small natural pause
      await new Promise((r) => setTimeout(r, 120));
    }
    setPlaying(false);
  };

  // Reset on slide change
  useEffect(() => {
    setRevealed(1);
    stopAll();
    if (playing && userStartedRef.current) {
      const t = setTimeout(() => speakFrom(0), 200);
      return () => clearTimeout(t);
    }
  }, [idx]);

  // Stop speech when leaving page
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const togglePlay = () => {
    userStartedRef.current = true;
    if (playing) {
      stopAll();
      setPlaying(false);
    } else {
      setPlaying(true);
      void speakFrom(Math.max(0, revealed - 1));
    }
  };


  const advanceSlide = (dir: 1 | -1) => {
    setIdx((i) => Math.min(SLIDES.length - 1, Math.max(0, i + dir)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") advanceSlide(1);
      if (e.key === "ArrowLeft") advanceSlide(-1);
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const chapter = [...CHAPTERS].reverse().find((c) => slide.i >= c.start)?.label ?? "";
  const accent = meta?.accent ?? "amber";
  const accentClass = ACCENT_BG[accent] ?? ACCENT_BG.amber;
  // Reveal cards progressively based on narration progress
  const cardCount = meta?.cards.length ?? 0;
  const progress = sentences.length ? revealed / sentences.length : 0;
  const cardsVisible = Math.max(1, Math.ceil(progress * cardCount));
  const productsVisible = progress > 0.4;
  const currentSentence = sentences[Math.min(revealed - 1, sentences.length - 1)] ?? "";
  const speaking = playing && revealed < sentences.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">
              Yavar · Interactive Training
            </div>
            <h1 className="text-base font-semibold">
              Enterprise AI with Private LLM
            </h1>
          </div>
          <a
            href={videoAsset.url}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400 transition"
            download
          >
            ↓ MP4
          </a>
        </div>
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 px-6 pb-3">
          {CHAPTERS.map((c) => {
            const active = chapter === c.label;
            return (
              <button
                key={c.start}
                onClick={() => setIdx(c.start - 1)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-amber-500 text-slate-900"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_300px]">
        <section>
          {/* Stage */}
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accentClass} p-6 shadow-2xl animate-fade-in min-h-[460px]`}
          >
            {/* Header row: avatar + title */}
            <div className="flex items-start justify-between gap-4">
              <AIAvatar speaking={speaking} accent={accent} />
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-200/80">
                  Slide {slide.i} / {SLIDES.length} · {chapter}
                </div>
                <div className="mt-1 text-2xl font-bold leading-tight">
                  {meta?.headline ?? slide.title}
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(meta?.cards ?? []).map((c, i) => {
                const visible = i < cardsVisible;
                return (
                  <div
                    key={`${idx}-c-${i}`}
                    className={`rounded-xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur transition-all duration-500 ${
                      visible
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 translate-y-4 scale-95 pointer-events-none"
                    }`}
                    style={{ transitionDelay: visible ? `${i * 90}ms` : "0ms" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{c.icon ?? "•"}</span>
                      <div className="text-sm font-semibold text-amber-200">
                        {c.title}
                      </div>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
                      {c.body}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Product chips */}
            {meta?.products && (
              <div
                className={`mt-5 space-y-2 transition-all duration-700 ${
                  productsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                }`}
              >
                {meta.products.map((g) => (
                  <div key={g.group} className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 w-24 shrink-0">
                      {g.group}
                    </span>
                    {g.items.map((it, k) => (
                      <span
                        key={it}
                        className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-100 ring-1 ring-white/10 animate-scale-in"
                        style={{ animationDelay: `${k * 60}ms` }}
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Progress bar */}
            <div className="absolute left-0 top-0 h-1 bg-amber-500 transition-all" style={{ width: `${((idx + 1) / SLIDES.length) * 100}%` }} />
          </div>

          {/* Caption / current line */}
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400">
                {speaking ? "Now speaking" : revealed >= sentences.length ? "Section complete" : "Paused"}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={togglePlay}
                  className="rounded-md border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/25"
                >
                  {playing ? "⏸ Pause" : ttsSupported ? "▶ Play narration" : "▶ Play"}
                </button>
                <button
                  onClick={() => {
                    stopAll();
                    setPlaying(false);
                    setRevealed(sentences.length);
                  }}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
                >
                  Reveal all
                </button>
                <button
                  onClick={() => {
                    stopAll();
                    setPlaying(false);
                    setTtsSource((s) => (s === "ws" ? "browser" : "ws"));
                  }}
                  title="Toggle voice source"
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-white/10"
                >
                  {ttsSource === "ws" ? "🎙 Self-hosted" : "🗣 Browser"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-100 animate-fade-in" key={`s-${idx}-${revealed}`}>
              {currentSentence}
            </p>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${(revealed / Math.max(1, sentences.length)) * 100}%` }}
              />
            </div>
          </div>

          {/* Nav */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm disabled:opacity-30 hover:bg-white/10"
            >
              ← Previous
            </button>
            <div className="text-[11px] text-slate-400">← → arrows · Space to pause</div>
            <button
              onClick={() => setIdx((i) => Math.min(SLIDES.length - 1, i + 1))}
              disabled={idx === SLIDES.length - 1}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-30 hover:bg-amber-400"
            >
              Next →
            </button>
          </div>

          {/* Full narration */}
          <details className="mt-6 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-amber-400">
              Full narration transcript
            </summary>
            <div className="mt-3 space-y-2 text-[14px] leading-relaxed text-slate-300">
              {sentences.map((s, i) => (
                <p key={i} className={i < revealed ? "text-slate-100" : "text-slate-500"}>
                  {s}
                </p>
              ))}
            </div>
          </details>
        </section>

        <aside className="rounded-xl border border-white/10 bg-slate-900/60 p-3 h-fit sticky top-32">
          <div className="mb-2 px-1 text-[10px] uppercase tracking-[0.2em] text-amber-400">
            All Slides
          </div>
          <ol className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {SLIDES.map((s, i) => {
              const active = i === idx;
              return (
                <li key={s.i}>
                  <button
                    onClick={() => setIdx(i)}
                    className={`flex w-full items-start gap-2 rounded-md p-2 text-left text-xs transition ${
                      active
                        ? "bg-amber-500/15 ring-1 ring-amber-500/40"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${
                        active
                          ? "bg-amber-500 text-slate-900"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {s.i}
                    </span>
                    <span className="line-clamp-2 text-slate-200">
                      {SLIDE_META[s.i]?.headline ?? s.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </main>
      <TrainingChat currentSlide={slide.i} />
    </div>
  );
}
