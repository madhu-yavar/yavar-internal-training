import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import slidesData from "@/assets/training/slides.json";
import { SLIDE_META } from "@/assets/training/slide-meta";
import { AIAvatar } from "@/components/AIAvatar";
import { TrainingChat } from "@/components/TrainingChat";
import { TrainingQuiz } from "@/components/TrainingQuiz";
import { LovableTtsPlayer } from "@/lib/lovableTts";
import { AmbientMusic } from "@/lib/ambientMusic";

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
  const [completed, setCompleted] = useState(false);
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
  const [ttsSource, setTtsSource] = useState<"lovable" | "browser">("lovable");
  const [ttsVoice, setTtsVoice] = useState<string>("shimmer");
  const lovablePlayerRef = useRef<LovableTtsPlayer | null>(null);
  const cancelledRef = useRef(false);
  const idxRef = useRef(0);
  const [musicOn, setMusicOn] = useState(false);
  const musicRef = useRef<AmbientMusic | null>(null);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(1);
  useEffect(() => { rateRef.current = rate; lovablePlayerRef.current?.setRate(rate); }, [rate]);
  useEffect(() => { idxRef.current = idx; }, [idx]);

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
    // stop() keeps the AudioContext alive (prime/unlock survives) — only
    // dispose() on unmount or voice change.
    lovablePlayerRef.current?.stop();
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
      u.rate = rateRef.current;
      u.pitch = 1.05;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  const speakOne = async (text: string): Promise<void> => {
    if (ttsSource === "lovable") {
      try {
        // Reuse the player primed by togglePlay so the AudioContext stays
        // unlocked across sentences/slides — creating a fresh context
        // after an await loses the user-gesture and plays nothing.
        let player = lovablePlayerRef.current;
        if (!player) {
          player = new LovableTtsPlayer();
          player.prime();
          lovablePlayerRef.current = player;
        }
        player.setRate(rateRef.current);
        await player.speak(text, ttsVoice);
        return;
      } catch (e: any) {
        if (cancelledRef.current || e?.name === "AbortError") return;
        console.warn("Lovable TTS failed, falling back to browser TTS:", e);
        setTtsSource("browser");
      }
    }
    if (cancelledRef.current) return;
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
    if (cancelledRef.current) return;
    // Auto-advance to the next slide; effect will restart narration there.
    if (idxRef.current < SLIDES.length - 1) {
      setIdx(idxRef.current + 1);
    } else {
      setPlaying(false);
      setCompleted(true);
    }
  };

  // Reset on slide change
  useEffect(() => {
    setRevealed(1);
    stopAll();
    if (idx === SLIDES.length - 1) setCompleted(true);
    if (playing && userStartedRef.current) {
      const t = setTimeout(() => speakFrom(0), 200);
      return () => clearTimeout(t);
    }
  }, [idx]);

  // Stop speech when leaving page
  useEffect(() => {
    return () => {
      stopAll();
      lovablePlayerRef.current?.dispose();
      lovablePlayerRef.current = null;
      musicRef.current?.stop();
    };
  }, []);

  // Auto-duck background music while narrator is speaking
  const isSpeaking = playing && revealed < sentences.length;
  useEffect(() => {
    if (!musicRef.current) return;
    musicRef.current.setVolume(isSpeaking ? 0.012 : 0.05);
  }, [isSpeaking, musicOn]);



  const togglePlay = () => {
    userStartedRef.current = true;
    if (playing) {
      stopAll();
      setPlaying(false);
    } else {
      // CRITICAL: create + resume the AudioContext synchronously inside the
      // click handler. Doing this after any await loses the user gesture and
      // the context stays suspended (no audio, no error) — that's why the
      // first slide was silent.
      if (ttsSource === "lovable") {
        const player = new LovableTtsPlayer();
        player.prime();
        lovablePlayerRef.current?.stop();
        lovablePlayerRef.current = player;
      }
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">
              Yavar · Interactive Training
            </div>
            <h1 className="truncate text-sm font-semibold sm:text-base">
              Enterprise AI with Private LLM
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => completed && setQuizOpen(true)}
              disabled={!completed}
              title={completed ? "Take the quiz" : "Complete all slides to unlock the quiz"}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                completed
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                  : "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
              }`}
            >
              {completed ? "🎓 Quiz" : "🔒 Quiz"}
            </button>
            <button
              onClick={async () => {
                if (musicOn) {
                  musicRef.current?.stop();
                  musicRef.current = null;
                  setMusicOn(false);
                } else {
                  const m = new AmbientMusic();
                  await m.start(0.05);
                  musicRef.current = m;
                  setMusicOn(true);
                }
              }}
              title={musicOn ? "Mute background music" : "Play soft background music"}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                musicOn
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {musicOn ? "🎵 On" : "🎵"}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:flex-wrap sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CHAPTERS.map((c) => {
            const active = chapter === c.label;
            return (
              <button
                key={c.start}
                onClick={() => setIdx(c.start - 1)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition ${
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


      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[1fr_300px]">
        <section>
          {/* Stage */}
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accentClass} p-4 shadow-2xl animate-fade-in min-h-[380px] sm:min-h-[460px] sm:p-6`}
          >
            {/* Header row: avatar + title */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <AIAvatar speaking={speaking} accent={accent} />
              <div className="min-w-0 sm:text-right">
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-200/80">
                  Slide {slide.i} / {SLIDES.length} · {chapter}
                </div>
                <div className="mt-1 text-xl font-bold leading-tight sm:text-2xl">
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
                <select
                  value={ttsSource === "lovable" ? ttsVoice : "__browser__"}
                  onChange={(e) => {
                    stopAll();
                    setPlaying(false);
                    const v = e.target.value;
                    if (v === "__browser__") {
                      setTtsSource("browser");
                    } else {
                      setTtsSource("lovable");
                      setTtsVoice(v);
                    }
                  }}
                  title="Choose narrator voice"
                  className="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10 focus:outline-none"
                >
                  <optgroup label="Lovable AI (expressive)">
                    <option value="shimmer">🎙 Ari – Shimmer (warm)</option>
                    <option value="coral">🎙 Coral (bright, friendly)</option>
                    <option value="sage">🎙 Sage (calm, clear)</option>
                    <option value="ballad">🎙 Ballad (storyteller)</option>
                    <option value="verse">🎙 Verse (energetic)</option>
                    <option value="alloy">🎙 Alloy (neutral)</option>
                    <option value="ash">🎙 Ash (deep)</option>
                  </optgroup>
                  <optgroup label="Fallback">
                    <option value="__browser__">🗣 Browser voice</option>
                  </optgroup>
                </select>
                <select
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  title="Playback speed"
                  className="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10 focus:outline-none"
                >
                  {[0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2].map((r) => (
                    <option key={r} value={r}>{r}× speed</option>
                  ))}
                </select>
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

          {idx === SLIDES.length - 1 && (
            <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-6 text-center">
              <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">
                You've reached the end
              </div>
              <h3 className="mt-1 text-xl font-bold text-emerald-100">
                Ready to test what you've learned?
              </h3>
              <p className="mt-1 text-sm text-emerald-200/80">
                Take a 20-question quiz — fresh questions generated every time.
              </p>
              <button
                onClick={() => setQuizOpen(true)}
                className="mt-4 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
              >
                🎓 Start the Quiz
              </button>
            </div>
          )}
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
      {quizOpen && <TrainingQuiz onClose={() => setQuizOpen(false)} />}
    </div>
  );
}
