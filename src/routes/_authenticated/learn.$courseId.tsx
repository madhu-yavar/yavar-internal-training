import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AIAvatar } from "@/components/AIAvatar";
import { supabase } from "@/integrations/supabase/client";
import { AmbientMusic } from "@/lib/ambientMusic";
import { bindCuesToSlides, formatMs, narrationSentences, readGeneratedSegments, slideBullets, stripGeneratedMaterial, type TimedSegment } from "@/lib/courseMaterial";
import { LovableTtsPlayer } from "@/lib/lovableTts";
import { signMany } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/learn/$courseId")({
  component: CoursePlayer,
});

type Course = {
  id: string;
  title: string;
  description: string | null;
  voice: string;
  speed: number;
  published: boolean;
};

type Slide = {
  id: string;
  course_id: string;
  idx: number;
  title: string;
  body_md: string | null;
  image_url: string | null;
  narration_text: string | null;
};

type Cue = { id: string; idx: number; start_ms: number; end_ms: number; text: string };
type Quiz = {
  id: string;
  idx: number;
  prompt: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct: string;
  explanation: string | null;
  hint: string | null;
  topic: string | null;
  difficulty: string | null;
};

const ACCENTS = ["amber", "sky", "emerald", "rose", "cyan", "violet"];
const ACCENT_BG: Record<string, string> = {
  amber: "from-amber-500/20 to-amber-500/5 border-amber-400/30",
  sky: "from-sky-500/20 to-sky-500/5 border-sky-400/30",
  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-400/30",
  cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-400/30",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-400/30",
};

function CoursePlayer() {
  const { courseId } = Route.useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [cues, setCues] = useState<Cue[]>([]);
  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [signedImages, setSignedImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [voice, setVoice] = useState<string>("shimmer");
  const [speed, setSpeed] = useState<number>(1);
  const playerRef = useRef<LovableTtsPlayer | null>(null);
  const musicRef = useRef<AmbientMusic | null>(null);
  const cancelledRef = useRef(false);
  const idxRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [{ data: c, error: ce }, { data: s, error: se }, { data: cu }, { data: q }] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("slides").select("*").eq("course_id", courseId).order("idx"),
        supabase.from("srt_cues").select("*").eq("course_id", courseId).order("idx"),
        supabase.from("quiz_questions").select("*").eq("course_id", courseId).order("idx"),
      ]);
      if (cancelled) return;
      if (ce || se || !c) {
        setError(ce?.message || se?.message || "Course not found.");
        setLoading(false);
        return;
      }
      const orderedSlides = ((s as Slide[]) ?? []).sort((a, b) => a.idx - b.idx);
      setCourse(c as Course);
      setVoice(((c as Course).voice && (c as Course).voice !== "default") ? (c as Course).voice : "shimmer");
      setSpeed((c as Course).speed ?? 1);
      setSlides(orderedSlides);
      setCues((cu as Cue[]) ?? []);
      setQuiz((q as Quiz[]) ?? []);
      const paths = orderedSlides.map((slide) => slide.image_url).filter((p): p is string => !!p);
      setSignedImages(paths.length ? await signMany(paths, 3600) : {});
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const generatedSegments = useMemo(() => bindCuesToSlides(slides, cues), [slides, cues]);
  const slide = slides[idx];
  const accent = ACCENTS[idx % ACCENTS.length];
  const segments: TimedSegment[] = useMemo(() => {
    if (!slide) return [];
    return readGeneratedSegments(slide.body_md) ?? generatedSegments[idx] ?? [];
  }, [generatedSegments, idx, slide]);
  const lines = useMemo(() => {
    if (!slide) return [];
    return segments.length
      ? segments.map((s) => s.text).filter(Boolean)
      : narrationSentences(slide.narration_text || [slide.title, ...slideBullets(slide)].join(". "));
  }, [segments, slide]);
  const bullets = useMemo(() => (slide ? slideBullets(slide).slice(0, 6) : []), [slide]);
  const currentLine = lines[Math.min(revealed, Math.max(0, lines.length - 1))] ?? slide?.title ?? "";
  const speaking = playing && revealed < lines.length;

  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  const stopAll = () => {
    cancelledRef.current = true;
    playerRef.current?.stop();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const speakBrowser = (text: string) =>
    new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = speed;
      u.pitch = 1.04;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  const speakOne = async (text: string) => {
    try {
      let player = playerRef.current;
      if (!player) {
        player = new LovableTtsPlayer();
        player.prime();
        playerRef.current = player;
      }
      player.setRate(speed);
      await player.speak(text, voice);
    } catch {
      if (!cancelledRef.current) await speakBrowser(text);
    }
  };

  const speakFrom = async (start: number) => {
    cancelledRef.current = false;
    for (let i = start; i < lines.length; i++) {
      if (cancelledRef.current) return;
      setRevealed(i);
      await speakOne(lines[i]);
      if (cancelledRef.current) return;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    if (cancelledRef.current) return;
    setRevealed(lines.length);
    if (idxRef.current < slides.length - 1) setIdx(idxRef.current + 1);
    else {
      setPlaying(false);
      setCompleted(true);
    }
  };

  useEffect(() => {
    setRevealed(0);
    if (idx === slides.length - 1 && slides.length > 0) setCompleted(true);
    if (startedRef.current && playing) {
      stopAll();
      const t = window.setTimeout(() => void speakFrom(0), 180);
      return () => window.clearTimeout(t);
    }
  }, [idx]);

  useEffect(() => {
    return () => {
      stopAll();
      playerRef.current?.dispose();
      musicRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    musicRef.current?.setVolume(speaking ? 0.012 : 0.05);
  }, [speaking]);

  const togglePlay = () => {
    startedRef.current = true;
    if (playing) {
      stopAll();
      setPlaying(false);
      return;
    }
    const player = new LovableTtsPlayer();
    player.prime();
    playerRef.current?.stop();
    playerRef.current = player;
    setPlaying(true);
    void speakFrom(Math.min(revealed, Math.max(0, lines.length - 1)));
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading course…</div>;
  if (error || !course || !slide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <h1 className="text-lg font-semibold">Course unavailable</h1>
          <p className="mt-2 text-sm text-rose-100/80">{error || "No generated slides were found for this course."}</p>
          <Link to="/learn" className="mt-5 inline-block rounded-md border border-white/10 px-4 py-2 text-sm hover:bg-white/10">Back to library</Link>
        </div>
      </div>
    );
  }

  const imageUrl = slide.image_url ? signedImages[slide.image_url] || slide.image_url : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-900/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <Link to="/learn" className="text-[11px] font-semibold text-amber-300 hover:text-amber-200">← Library</Link>
            <h1 className="truncate text-base font-semibold">{course.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => completed && setQuizOpen(true)}
              disabled={!completed || quiz.length === 0}
              className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
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
                  const music = new AmbientMusic();
                  await music.start(0.05);
                  musicRef.current = music;
                  setMusicOn(true);
                }
              }}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${musicOn ? "border-amber-400/40 bg-amber-500/15 text-amber-100" : "border-white/10 bg-white/5 text-slate-300"}`}
            >
              {musicOn ? "🎵 On" : "🎵 Music"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_310px]">
        <section>
          <div key={slide.id} className={`relative min-h-[430px] overflow-hidden rounded-2xl border bg-gradient-to-br ${ACCENT_BG[accent]} p-4 shadow-2xl animate-fade-in sm:min-h-[520px] sm:p-6`}>
            <div className="absolute left-0 top-0 h-1 bg-amber-400 transition-all" style={{ width: `${((idx + 1) / slides.length) * 100}%` }} />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <AIAvatar speaking={speaking} accent={accent} />
              <div className="min-w-0 sm:text-right">
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-200/80">Slide {idx + 1} / {slides.length}</div>
                <h2 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{slide.title}</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,1.05fr)]">
              <div className="space-y-3">
                {bullets.length > 0 ? bullets.map((bullet, i) => {
                  const visible = i <= Math.max(0, revealed);
                  return (
                    <div key={i} className={`rounded-xl border border-white/10 bg-slate-950/55 p-4 transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`} style={{ transitionDelay: `${i * 80}ms` }}>
                      <div className="text-[13px] leading-relaxed text-slate-100">{bullet}</div>
                    </div>
                  );
                }) : (
                  <div className="rounded-xl border border-white/10 bg-slate-950/55 p-4 text-sm leading-relaxed text-slate-200">
                    {stripGeneratedMaterial(slide.body_md) || currentLine}
                  </div>
                )}
              </div>
              {imageUrl && (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
                  <img src={imageUrl} alt={slide.title} className="h-full max-h-[350px] w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400">{speaking ? "Now speaking" : revealed >= lines.length ? "Slide complete" : "Ready"}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-100" key={`${idx}-${revealed}`}>{currentLine}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button onClick={togglePlay} className="rounded-md border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/25">
                  {playing ? "⏸ Pause" : "▶ Play voice-over"}
                </button>
                <button
                  onClick={() => {
                    stopAll();
                    setPlaying(false);
                    setRevealed(lines.length);
                  }}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                >
                  Reveal all
                </button>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(Math.min(lines.length, revealed + 1) / Math.max(1, lines.length)) * 100}%` }} />
            </div>
          </div>

          {segments.length > 0 && (
            <details className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-amber-400">Timed SRT binding</summary>
              <ol className="mt-3 space-y-2 text-sm">
                {segments.map((segment, i) => (
                  <li key={`${segment.startMs}-${i}`} className={i <= revealed ? "text-slate-100" : "text-slate-500"}>
                    <span className="mr-2 font-mono text-[11px] text-amber-300">{formatMs(segment.startMs)}–{formatMs(segment.endMs)}</span>
                    {segment.text}
                  </li>
                ))}
              </ol>
            </details>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm disabled:opacity-30 hover:bg-white/10">← Previous</button>
            <button onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-30 hover:bg-amber-400">Next →</button>
          </div>

          {idx === slides.length - 1 && (
            <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-6 text-center">
              <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">End of material</div>
              <h3 className="mt-1 text-xl font-bold text-emerald-100">Ready for the quiz?</h3>
              <p className="mt-1 text-sm text-emerald-200/80">{quiz.length} questions are attached to this course.</p>
              <button onClick={() => setQuizOpen(true)} disabled={quiz.length === 0} className="mt-4 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-40">🎓 Start Quiz</button>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-xl border border-white/10 bg-slate-900/60 p-3 lg:sticky lg:top-24">
          <div className="mb-2 px-1 text-[10px] uppercase tracking-[0.2em] text-amber-400">Generated slides</div>
          <ol className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {slides.map((s, i) => (
              <li key={s.id}>
                <button onClick={() => setIdx(i)} className={`flex w-full items-start gap-2 rounded-md p-2 text-left text-xs transition ${i === idx ? "bg-amber-500/15 ring-1 ring-amber-500/40" : "hover:bg-white/5"}`}>
                  <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${i === idx ? "bg-amber-500 text-slate-900" : "bg-white/10 text-slate-300"}`}>{i + 1}</span>
                  <span className="line-clamp-2 text-slate-200">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </main>
      {quizOpen && <CourseQuiz quiz={quiz} courseTitle={course.title} onClose={() => setQuizOpen(false)} />}
    </div>
  );
}

function CourseQuiz({ quiz, courseTitle, onClose }: { quiz: Quiz[]; courseTitle: string; onClose: () => void }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [hintsShown, setHintsShown] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const q = quiz[current];
  const score = quiz.reduce((acc, item, i) => acc + (answers[i] === correctIndex(item.correct) ? 1 : 0), 0);
  const pct = quiz.length ? Math.round((score / quiz.length) * 100) : 0;

  if (!q) return null;
  const options = [q.option_a, q.option_b, q.option_c, q.option_d].filter((o): o is string => !!o);
  const answered = answers[current] !== undefined;
  const correct = correctIndex(q.correct);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">Final Assessment</div>
            <div className="text-base font-semibold text-slate-100">{courseTitle}</div>
          </div>
          <button onClick={onClose} className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10">✕ Close</button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          {!submitted ? (
            <div>
              <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
                <span>Question {current + 1} of {quiz.length}</span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">{q.topic || q.difficulty || "Quiz"}</span>
              </div>
              <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full bg-amber-400" style={{ width: `${((current + 1) / quiz.length) * 100}%` }} /></div>
              <h3 className="mt-4 text-lg font-semibold text-slate-100">{q.prompt}</h3>
              {!answered && q.hint && (
                <div className="mt-3">
                  {hintsShown[current] ? <div className="rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">💡 {q.hint}</div> : <button onClick={() => setHintsShown((h) => ({ ...h, [current]: true }))} className="rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200 hover:bg-sky-500/20">💡 Show hint</button>}
                </div>
              )}
              <div className="mt-4 space-y-2">
                {options.map((opt, i) => {
                  const chosen = answers[current] === i;
                  const isCorrect = i === correct;
                  let cls = "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10";
                  if (answered) cls = isCorrect ? "border-emerald-400 bg-emerald-500/15 text-emerald-100" : chosen ? "border-rose-400 bg-rose-500/15 text-rose-100" : "border-white/5 bg-white/0 text-slate-400";
                  return <button key={i} disabled={answered} onClick={() => setAnswers((a) => ({ ...a, [current]: i }))} className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${cls}`}><span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>{opt}</button>;
                })}
              </div>
              {answered && <div className={`mt-4 rounded-lg border p-3 text-sm ${answers[current] === correct ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100" : "border-rose-500/40 bg-rose-500/10 text-rose-100"}`}><div className="font-semibold">{answers[current] === correct ? "✅ Correct" : "❌ Not quite"}</div>{q.explanation && <div className="mt-2 text-xs leading-relaxed text-slate-100/90">📘 {q.explanation}</div>}</div>}
              <div className="mt-6 flex items-center justify-between">
                <button disabled={current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))} className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-white/10">← Prev</button>
                <div className="text-xs text-slate-400">Answered: {Object.keys(answers).length}/{quiz.length}</div>
                {current < quiz.length - 1 ? <button onClick={() => setCurrent((c) => c + 1)} className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-400">Next →</button> : <button disabled={Object.keys(answers).length < quiz.length} onClick={() => setSubmitted(true)} className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-30 hover:bg-emerald-400">Submit ✓</button>}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-6 text-center">
              <div className="text-[11px] uppercase tracking-[0.25em] text-amber-300">Your result</div>
              <div className="mt-2 text-5xl font-bold text-amber-100">{score}/{quiz.length}</div>
              <div className="mt-1 text-2xl font-semibold text-amber-200">{pct}%</div>
              <button onClick={onClose} className="mt-5 rounded-md border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-200 hover:bg-white/10">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function correctIndex(correct: string) {
  return Math.max(0, ["A", "B", "C", "D"].indexOf(correct.toUpperCase()));
}
