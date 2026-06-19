import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import slidesData from "@/assets/training/slides.json";

// Eager-import all slide PNGs as URLs
const slideImages = import.meta.glob("@/assets/training/slide-*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const sortedImageUrls = Object.keys(slideImages)
  .sort()
  .map((k) => slideImages[k]);

type Slide = { i: number; title: string; notes: string };
const SLIDES = slidesData as Slide[];

const CHAPTERS = [
  { start: 1, label: "Introduction" },
  { start: 4, label: "Architecture & RAG" },
  { start: 8, label: "Agentic AI" },
  { start: 12, label: "Deployment" },
  { start: 16, label: "Presales Playbook" },
];

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
  const [revealed, setRevealed] = useState(0);
  const slide = SLIDES[idx];
  const img = sortedImageUrls[idx];

  const sentences = useMemo(
    () =>
      (slide.notes || slide.title)
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean),
    [slide],
  );

  useEffect(() => {
    setRevealed(0);
    const id = setInterval(() => {
      setRevealed((r) => (r >= sentences.length ? r : r + 1));
    }, 1400);
    return () => clearInterval(id);
  }, [idx, sentences.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(SLIDES.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const chapter =
    [...CHAPTERS].reverse().find((c) => slide.i >= c.start)?.label ?? "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-amber-400">
              Yavar · Training Module
            </div>
            <h1 className="text-lg font-semibold">
              Enterprise AI with Private LLM – Technical & Presales Deep Dive
            </h1>
          </div>
          <a
            href="/Enterprise_AI_Private_LLM_Training_v2.mp4"
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 transition"
            download
          >
            Download MP4
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

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div
            key={idx}
            className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl animate-fade-in"
          >
            <img
              src={img}
              alt={slide.title}
              className="absolute inset-0 h-full w-full object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6">
              <div className="text-[11px] uppercase tracking-[0.25em] text-amber-300">
                Slide {slide.i} / {SLIDES.length} · {chapter}
              </div>
              <div className="mt-1 text-xl font-semibold">{slide.title}</div>
            </div>
            <div className="absolute left-0 top-0 h-1 bg-amber-500 transition-all" style={{ width: `${((idx + 1) / SLIDES.length) * 100}%` }} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm disabled:opacity-30 hover:bg-white/10"
            >
              ← Previous
            </button>
            <div className="text-xs text-slate-400">
              Use ← → arrow keys to navigate
            </div>
            <button
              onClick={() => setIdx((i) => Math.min(SLIDES.length - 1, i + 1))}
              disabled={idx === SLIDES.length - 1}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-30 hover:bg-amber-400"
            >
              Next →
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-400">
              Narration
            </div>
            <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-200">
              {sentences.map((s, i) => (
                <p
                  key={`${idx}-${i}`}
                  className={`transition-all duration-500 ${
                    i < revealed
                      ? "opacity-100 translate-y-0"
                      : "opacity-30 translate-y-1"
                  }`}
                >
                  {s}
                </p>
              ))}
            </div>
            {revealed < sentences.length && (
              <button
                onClick={() => setRevealed(sentences.length)}
                className="mt-4 text-xs text-amber-400 hover:underline"
              >
                Reveal all
              </button>
            )}
          </div>
        </section>

        <aside className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-amber-400">
            All Slides
          </div>
          <ol className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {SLIDES.map((s, i) => {
              const active = i === idx;
              return (
                <li key={s.i}>
                  <button
                    onClick={() => setIdx(i)}
                    className={`flex w-full items-start gap-3 rounded-md p-2 text-left text-sm transition ${
                      active
                        ? "bg-amber-500/15 ring-1 ring-amber-500/40"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-semibold ${
                        active
                          ? "bg-amber-500 text-slate-900"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {s.i}
                    </span>
                    <span className="line-clamp-2 text-slate-200">
                      {s.title || `Slide ${s.i}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </main>
    </div>
  );
}
