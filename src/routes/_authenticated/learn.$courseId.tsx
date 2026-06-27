import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AIAvatar } from "@/components/AIAvatar";
import { TrainingChat } from "@/components/TrainingChat";
import { MessageAdminDialog } from "@/components/MessageAdminDialog";
import { BrandFooter } from "@/components/BrandFooter";
import { LearningScene } from "@/components/LearningScene";
import { VideoPlayer } from "@/components/VideoPlayer";
import yavarLogo from "@/assets/yavar-logo.png.asset.json";
import { useAuthCtx } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AmbientMusic } from "@/lib/ambientMusic";
import { stripGeneratedMaterial } from "@/lib/courseMaterial";
import { readScenes, scenePhaseLines, stripScenes, type LearningScene as Scene, type ScenePhase } from "@/lib/learningScenes";
import { WsTtsPlayer, buildTtsUrl } from "@/lib/wsTts";
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
  illustration_url?: string | null;
  icon_keywords?: string[] | null;
  video_url: string | null;
  video_type: 'mp4' | 'youtube' | 'vimeo' | 'loom' | null;
  video_poster_url: string | null;
  video_duration_ms: number | null;
};

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

type PlayUnit = {
  key: string;
  sourceSlide: Slide;
  scene: Scene;
  sceneIndexInSlide: number;
  scenesInSlide: number;
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

function fallbackSceneFromSlide(s: Slide): Scene {
  const bullets = stripScenes(stripGeneratedMaterial(s.body_md))
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
  return {
    concept: s.title || "Concept",
    intro: s.narration_text || `Let's look at ${s.title || "this idea"}.`,
    analogy: null,
    example: bullets.length >= 2 ? { caption: "What's on the slide", nodes: bullets.slice(0, 4) } : null,
    technical: null,
    takeaway: bullets[bullets.length - 1] || s.title || "",
    narration: {
      intro: s.narration_text || s.title,
      takeaway: bullets[bullets.length - 1] || s.title || "",
    },
    keywords: s.icon_keywords ?? [],
  };
}

function CoursePlayer() {
  const { courseId } = Route.useParams();
  const { user } = useAuthCtx();
  const [course, setCourse] = useState<Course | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [msgOpen, setMsgOpen] = useState(false);
  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [signedImages, setSignedImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitIdx, setUnitIdx] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const playerRef = useRef<WsTtsPlayer | null>(null);
  const musicRef = useRef<AmbientMusic | null>(null);
  const cancelledRef = useRef(false);
  const unitIdxRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [{ data: c, error: ce }, { data: s, error: se }, { data: q }] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("slides").select("*").eq("course_id", courseId).order("idx"),
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
      setSpeed((c as Course).speed ?? 1);
      setSlides(orderedSlides);
      setQuiz((q as Quiz[]) ?? []);
      const paths = [
        ...orderedSlides.map((sl) => sl.image_url),
        ...orderedSlides.map((sl) => sl.illustration_url),
        ...orderedSlides.map((sl) => sl.video_poster_url),
      ].filter((p): p is string => !!p && !/^https?:\/\//.test(p));
      setSignedImages(paths.length ? await signMany(paths, 3600) : {});
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Flatten scenes across slides into linear play units.
  const playUnits = useMemo<PlayUnit[]>(() => {
    const out: PlayUnit[] = [];
    for (const sl of slides) {
      const scenes = readScenes(sl.body_md) ?? [fallbackSceneFromSlide(sl)];
      scenes.forEach((scene, i) => {
        out.push({
          key: `${sl.id}-${i}`,
          sourceSlide: sl,
          scene,
          sceneIndexInSlide: i,
          scenesInSlide: scenes.length,
        });
      });
    }
    return out;
  }, [slides]);

  const unit = playUnits[unitIdx];
  const accent = ACCENTS[unitIdx % ACCENTS.length];
  const phases = useMemo(() => (unit ? scenePhaseLines(unit.scene) : []), [unit]);
  const currentPhase: ScenePhase = phases[Math.min(phaseIdx, Math.max(0, phases.length - 1))]?.phase ?? "intro";
  const currentLine = phases[Math.min(phaseIdx, Math.max(0, phases.length - 1))]?.text ?? unit?.scene.intro ?? "";
  const speaking = playing && phaseIdx < phases.length;

  useEffect(() => {
    unitIdxRef.current = unitIdx;
  }, [unitIdx]);

  const stopAll = () => {
    cancelledRef.current = true;
    playerRef.current?.stop();
  };

  const speakOne = async (text: string) => {
    let player = playerRef.current;
    if (!player) {
      player = new WsTtsPlayer({ url: buildTtsUrl(speed, "af_heart", "a") });
      player.prime();
      playerRef.current = player;
    }
    player.setUrl(buildTtsUrl(speed, "af_heart", "a"));
    await player.speak(text);
  };

  const playFrom = async (startPhase: number) => {
    cancelledRef.current = false;
    for (let i = startPhase; i < phases.length; i++) {
      if (cancelledRef.current) return;
      setPhaseIdx(i);
      await speakOne(phases[i].text);
      if (cancelledRef.current) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (cancelledRef.current) return;
    setPhaseIdx(phases.length);
    if (unitIdxRef.current < playUnits.length - 1) {
      setUnitIdx(unitIdxRef.current + 1);
    } else {
      setPlaying(false);
      setCompleted(true);
    }
  };

  useEffect(() => {
    setPhaseIdx(0);
    if (unitIdx === playUnits.length - 1 && playUnits.length > 0) setCompleted(true);
    if (startedRef.current && playing) {
      stopAll();
      const t = window.setTimeout(() => void playFrom(0), 180);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitIdx]);

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

  useEffect(() => {
    playerRef.current?.setUrl(buildTtsUrl(speed, "af_heart", "a"));
  }, [speed]);

  const togglePlay = () => {
    startedRef.current = true;
    if (playing) {
      stopAll();
      setPlaying(false);
      return;
    }
    const player = new WsTtsPlayer({ url: buildTtsUrl(speed, "af_heart", "a") });
    player.prime();
    playerRef.current?.stop();
    playerRef.current = player;
    setPlaying(true);
    void playFrom(Math.min(phaseIdx, Math.max(0, phases.length - 1)));
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading course…</div>;
  if (error || !course || !unit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <h1 className="text-lg font-semibold">Course unavailable</h1>
          <p className="mt-2 text-sm text-rose-100/80">{error || "No learning scenes have been generated yet. Ask an admin to regenerate."}</p>
          <Link to="/learn" className="mt-5 inline-block rounded-md border border-white/10 px-4 py-2 text-sm hover:bg-white/10">Back to library</Link>
        </div>
      </div>
    );
  }

  const illustrationUrl = unit.sourceSlide.illustration_url
    ? signedImages[unit.sourceSlide.illustration_url] || unit.sourceSlide.illustration_url
    : null;
  const slideImageUrl = unit.sourceSlide.image_url
    ? signedImages[unit.sourceSlide.image_url] || unit.sourceSlide.image_url
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-900/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link to="/learn" aria-label="Library">
              <img src={yavarLogo.url} alt="Yavar" className="h-7 w-auto shrink-0" />
            </Link>
            <div className="min-w-0">
              <Link to="/learn" className="text-[11px] font-semibold text-amber-300 hover:text-amber-200">← Library</Link>
              <h1 className="truncate text-base font-semibold">{course.title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
              Voice <span className="text-slate-100">Yavar · af_heart</span>
            </div>
            <label className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
              <span className="text-slate-400">Speed</span>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="bg-transparent text-xs text-slate-100 outline-none"
              >
                {[0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2].map((s) => (
                  <option key={s} value={s} className="bg-slate-900">{s}×</option>
                ))}
              </select>
            </label>
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
            <button
              onClick={() => setMsgOpen(true)}
              title="Suggest a correction to this course"
              aria-label="Suggest correction"
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            >
              ✏️
            </button>
          </div>
        </div>
      </header>

      <main className="relative h-[calc(100vh-57px)] w-full overflow-hidden">
        <style>{`@keyframes slideFade{from{opacity:0;transform:scale(.99)}to{opacity:1;transform:none}}@keyframes kenBurns{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.08) translate(-1%,-1%)}}@keyframes kenBurnsAlt{0%{transform:scale(1.06) translate(1%,1%)}100%{transform:scale(1) translate(0,0)}}@keyframes illIn{0%{opacity:0;transform:scale(.94) translateY(12px)}60%{opacity:1}100%{opacity:1;transform:scale(1) translateY(0)}}@keyframes shimmerBorder{0%,100%{box-shadow:0 0 0 1px rgba(232,121,249,.35),0 20px 60px -20px rgba(232,121,249,.35)}50%{box-shadow:0 0 0 1px rgba(232,121,249,.6),0 25px 80px -15px rgba(232,121,249,.55)}}`}</style>
        <div className="grid h-full w-full grid-rows-[minmax(0,44%)_minmax(0,56%)] lg:grid-cols-[auto_minmax(0,1fr)_minmax(360px,440px)] lg:grid-rows-1">

          {/* LEFT: collapsible scenes panel */}
          <aside
            className={`hidden lg:flex h-full flex-col border-r border-white/10 bg-slate-900/60 transition-[width] duration-300 ${navOpen ? "w-72" : "w-12"}`}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-2 py-2">
              {navOpen && (
                <div className="px-1 text-[10px] uppercase tracking-[0.2em] text-amber-400">
                  Scenes · {playUnits.length}
                </div>
              )}
              <button
                onClick={() => setNavOpen((v) => !v)}
                title={navOpen ? "Collapse" : "Expand"}
                className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                {navOpen ? "‹" : "›"}
              </button>
            </div>
            <ol className="flex-1 space-y-1 overflow-y-auto p-2">
              {playUnits.map((u, i) => {
                const active = i === unitIdx;
                return (
                  <li key={u.key}>
                    <button
                      onClick={() => setUnitIdx(i)}
                      title={u.scene.concept}
                      className={`flex w-full items-start gap-2 rounded-md p-2 text-left text-xs transition ${active ? "bg-amber-500/15 ring-1 ring-amber-500/40" : "hover:bg-white/5"}`}
                    >
                      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${active ? "bg-amber-500 text-slate-900" : "bg-white/10 text-slate-300"}`}>
                        {i + 1}
                      </span>
                      {navOpen && (
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-medium text-slate-100">{u.scene.concept}</span>
                          {u.scenesInSlide > 1 && (
                            <span className="block text-[10px] text-slate-500">from "{u.sourceSlide.title}"</span>
                          )}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* CENTER: slide deck */}
          <section className="relative flex h-full min-h-0 flex-col bg-slate-950">
            <div className="absolute left-0 top-0 z-10 h-1 w-full bg-white/5">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${((unitIdx + 1) / playUnits.length) * 100}%` }}
              />
            </div>
            <div className="absolute right-3 top-3 z-10 rounded-md border border-white/10 bg-slate-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-amber-200/80 backdrop-blur">
              Scene {unitIdx + 1} / {playUnits.length}
            </div>
            <div className="relative flex h-full items-center justify-center p-3 sm:p-6">
              {unit.sourceSlide.video_url ? (
                /* Video content */
                <div className="h-full w-full">
                  <VideoPlayer
                    videoUrl={unit.sourceSlide.video_url}
                    videoType={unit.sourceSlide.video_type}
                    posterUrl={
                      unit.sourceSlide.video_poster_url
                        ? signedImages[unit.sourceSlide.video_poster_url] || unit.sourceSlide.video_poster_url
                        : slideImageUrl || illustrationUrl || undefined
                    }
                    autoPlay={playing && phaseIdx === 0}
                    muted={false}
                    className="h-full w-full rounded-xl overflow-hidden"
                  />
                </div>
              ) : slideImageUrl || illustrationUrl ? (
                slideImageUrl && illustrationUrl ? (
                  /* Both: split — slide on top, AI illustration on bottom, both always visible & animated */
                  <div className="grid h-full w-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                    <figure className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 shadow-2xl">
                      <img
                        key={`slide-${slideImageUrl}-${unitIdx}`}
                        src={slideImageUrl}
                        alt={unit.sourceSlide.title || unit.scene.concept}
                        className="absolute inset-0 h-full w-full object-contain"
                        style={{ animation: "slideFade .6s ease-out both" }}
                      />
                      <figcaption className="absolute left-3 top-3 rounded-full border border-white/15 bg-slate-950/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-amber-200 backdrop-blur">
                        📄 Source slide
                      </figcaption>
                    </figure>
                    <figure
                      className="relative overflow-hidden rounded-xl border border-fuchsia-400/40 bg-slate-900/40"
                      style={{ animation: "illIn .9s ease-out both, shimmerBorder 4s ease-in-out infinite" }}
                    >
                      <img
                        key={`ill-${illustrationUrl}-${unitIdx}`}
                        src={illustrationUrl}
                        alt={`AI illustration for ${unit.scene.concept}`}
                        className="absolute inset-0 h-full w-full object-contain"
                        style={{
                          animation: `${unitIdx % 2 === 0 ? "kenBurns" : "kenBurnsAlt"} 14s ease-in-out infinite alternate`,
                          transformOrigin: "center",
                        }}
                      />
                      <figcaption className="absolute left-3 top-3 rounded-full border border-fuchsia-400/40 bg-slate-950/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200 backdrop-blur">
                        ✨ AI illustration
                      </figcaption>
                      <figcaption className="absolute bottom-3 right-3 max-w-[70%] truncate rounded-md border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-200 backdrop-blur">
                        {unit.scene.concept}
                      </figcaption>
                    </figure>
                  </div>
                ) : (
                  /* Single image: fill the pane with Ken Burns */
                  <figure
                    className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 shadow-2xl"
                    style={{ animation: "slideFade .6s ease-out both" }}
                  >
                    <img
                      key={`one-${slideImageUrl || illustrationUrl}-${unitIdx}`}
                      src={(slideImageUrl || illustrationUrl) as string}
                      alt={unit.sourceSlide.title || unit.scene.concept}
                      className="absolute inset-0 h-full w-full object-contain"
                      style={{
                        animation: `${unitIdx % 2 === 0 ? "kenBurns" : "kenBurnsAlt"} 16s ease-in-out infinite alternate`,
                      }}
                    />
                    {illustrationUrl && !slideImageUrl && (
                      <figcaption className="absolute left-3 top-3 rounded-full border border-fuchsia-400/40 bg-slate-950/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200 backdrop-blur">
                        ✨ AI illustration
                      </figcaption>
                    )}
                  </figure>
                )
              ) : (
                <div className={`flex h-full w-full items-center justify-center rounded-xl border bg-gradient-to-br ${ACCENT_BG[accent]} p-8 text-center`}>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300">Slide</div>
                    <h3 className="mt-2 text-2xl font-bold text-slate-50">{unit.sourceSlide.title}</h3>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: narration column */}
          <section className="flex h-full min-h-0 flex-col border-t border-white/10 bg-slate-900/40 lg:border-l lg:border-t-0">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <AIAvatar speaking={speaking} accent={accent} />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300">
                    {speaking ? "Now speaking" : phaseIdx >= phases.length ? "Scene complete" : "Ready"}
                  </div>
                  <div className="truncate text-xs text-slate-400">{unit.sourceSlide.title}</div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <LearningScene
                scene={unit.scene}
                phase={currentPhase}
                speaking={speaking}
                accent={accent}
                illustrationUrl={illustrationUrl}
                slideImageUrl={null}
                sceneNumber={unit.sceneIndexInSlide + 1}
                totalScenes={unit.scenesInSlide}
                sourceSlideTitle={unit.sourceSlide.title}
              />

              {unitIdx === playUnits.length - 1 && (
                <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-5 text-center">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">End of material</div>
                  <h3 className="mt-1 text-lg font-bold text-emerald-100">Ready for the quiz?</h3>
                  <p className="mt-1 text-xs text-emerald-200/80">{quiz.length} questions attached.</p>
                  <button
                    onClick={() => setQuizOpen(true)}
                    disabled={quiz.length === 0}
                    className="mt-3 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-40"
                  >
                    🎓 Start Quiz
                  </button>
                </div>
              )}
            </div>

            {/* Bottom dock — controls never reflow */}
            <div className="shrink-0 border-t border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur">
              <p
                key={`${unitIdx}-${phaseIdx}`}
                className="mb-3 line-clamp-3 text-[13px] leading-relaxed text-slate-100"
              >
                {currentLine}
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${(Math.min(phases.length, phaseIdx + 1) / Math.max(1, phases.length)) * 100}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setUnitIdx((i) => Math.max(0, i - 1))}
                    disabled={unitIdx === 0}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs disabled:opacity-30 hover:bg-white/10"
                  >
                    ←
                  </button>
                  <button
                    onClick={togglePlay}
                    className="rounded-md border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
                  >
                    {playing ? "⏸ Pause" : "▶ Play"}
                  </button>
                  <button
                    onClick={() => {
                      stopAll();
                      setPlaying(false);
                      setPhaseIdx(phases.length);
                    }}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                  >
                    Reveal
                  </button>
                  <button
                    onClick={() => setUnitIdx((i) => Math.min(playUnits.length - 1, i + 1))}
                    disabled={unitIdx === playUnits.length - 1}
                    className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-30 hover:bg-amber-400"
                  >
                    →
                  </button>
                </div>
                {/* Mobile scene picker */}
                <select
                  value={unitIdx}
                  onChange={(e) => setUnitIdx(Number(e.target.value))}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 lg:hidden"
                >
                  {playUnits.map((u, i) => (
                    <option key={u.key} value={i} className="bg-slate-900">
                      {i + 1}. {u.scene.concept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      </main>
      {quizOpen && <CourseQuiz quiz={quiz} courseTitle={course.title} courseId={courseId} userId={user?.id ?? null} onClose={() => setQuizOpen(false)} />}
      {user?.id && (
        <MessageAdminDialog
          open={msgOpen}
          onClose={() => setMsgOpen(false)}
          userId={user.id}
          courseId={courseId}
          defaultType="correction"
          defaultSubject={`Correction for "${course.title}" (scene ${unitIdx + 1})`}
        />
      )}
      <TrainingChat
        currentSlide={unit.sourceSlide.idx + 1}
        course={{
          title: course.title,
          slides: slides.map((s) => ({
            i: s.idx + 1,
            title: s.title,
            notes: [stripGeneratedMaterial(s.body_md), s.narration_text ?? ""]
              .filter(Boolean)
              .join("\n\n"),
          })),
        }}
      />
      <BrandFooter />
    </div>
  );
}

function CourseQuiz({ quiz, courseTitle, courseId, userId, onClose }: { quiz: Quiz[]; courseTitle: string; courseId: string; userId: string | null; onClose: () => void }) {
  // Sample 20 random questions AND shuffle the option order within each one,
  // remapping the correct-answer index so it points at the new position.
  const sampled = useMemo(() => {
    const arr = [...quiz];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.min(20, arr.length)).map((q) => {
      const raw = [q.option_a, q.option_b, q.option_c, q.option_d];
      const present = raw
        .map((o, i) => ({ o, i }))
        .filter((x): x is { o: string; i: number } => !!x.o);
      for (let i = present.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [present[i], present[j]] = [present[j], present[i]];
      }
      const origCorrect = correctIndex(q.correct);
      const correct = Math.max(0, present.findIndex((x) => x.i === origCorrect));
      return { q, options: present.map((p) => p.o), correct };
    });
  }, [quiz]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [hintsShown, setHintsShown] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const item = sampled[current];
  const score = sampled.reduce((acc, it, i) => acc + (answers[i] === it.correct ? 1 : 0), 0);
  const pct = sampled.length ? Math.round((score / sampled.length) * 100) : 0;

  if (!item) return null;
  const q = item.q;
  const options = item.options;
  const answered = answers[current] !== undefined;
  const correct = item.correct;

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
                <span>Question {current + 1} of {sampled.length}</span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">{q.topic || q.difficulty || "Quiz"}</span>
              </div>
              <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full bg-amber-400" style={{ width: `${((current + 1) / sampled.length) * 100}%` }} /></div>
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
                <div className="text-xs text-slate-400">Answered: {Object.keys(answers).length}/{sampled.length}</div>
                {current < sampled.length - 1 ? <button onClick={() => setCurrent((c) => c + 1)} className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-400">Next →</button> : <button disabled={Object.keys(answers).length < sampled.length} onClick={async () => {
                  setSubmitted(true);
                  if (userId) {
                    await supabase.from("quiz_attempts").insert({ user_id: userId, course_id: courseId, score, total: sampled.length });
                  }
                }} className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-30 hover:bg-emerald-400">Submit ✓</button>}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-6 text-center">
              <div className="text-[11px] uppercase tracking-[0.25em] text-amber-300">Your result</div>
              <div className="mt-2 text-5xl font-bold text-amber-100">{score}/{sampled.length}</div>
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
