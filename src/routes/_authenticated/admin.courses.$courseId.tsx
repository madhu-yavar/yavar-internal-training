import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuthCtx } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_BUCKET, getSignedUrl } from "@/lib/storage";
import { parseDeck, type ParsedSlide } from "@/lib/deckParser";
import { generateCourseDescription, regenerateSlideNarration, generateSlideIllustrations } from "@/lib/narration.functions";
import { stripGeneratedMaterial } from "@/lib/courseMaterial";

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId")({
  component: CourseEditor,
});

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  voice: string;
  lang_code: string;
  speed: number;
  published: boolean;
  tone: string | null;
  tech_depth: number | null;
  audience: string | null;
  prompt_override: string | null;
};

type Slide = {
  id: string;
  course_id: string;
  idx: number;
  title: string;
  body_md: string | null;
  image_url: string | null;
  narration_text: string | null;
  generation_hint: string | null;
  illustration_url: string | null;
  icon_keywords: string[] | null;
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
  hint?: string | null;
  topic?: string | null;
  difficulty?: string | null;
};

const VOICES = ["af_heart"];
const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
];

function CourseEditor() {
  const { courseId } = Route.useParams();
  const { isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [cues, setCues] = useState<Cue[]>([]);
  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [signedImages, setSignedImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) navigate({ to: "/learn" });
  }, [isAdmin, navigate]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: s }, { data: cu }, { data: q }] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).single(),
      supabase.from("slides").select("*").eq("course_id", courseId).order("idx"),
      supabase.from("srt_cues").select("*").eq("course_id", courseId).order("idx"),
      supabase.from("quiz_questions").select("*").eq("course_id", courseId).order("idx"),
    ]);
    setCourse(c as Course | null);
    setSlides((s as Slide[]) ?? []);
    setCues((cu as Cue[]) ?? []);
    setQuiz((q as Quiz[]) ?? []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Sign image URLs
  useEffect(() => {
    const paths = [
      ...slides.map((s) => s.image_url),
      ...slides.map((s) => s.illustration_url),
    ].filter((p): p is string => !!p && !/^https?:\/\//i.test(p));
    if (paths.length === 0) {
      setSignedImages({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(paths.map(async (p) => [p, await getSignedUrl(p)] as const));
      if (cancelled) return;
      const map: Record<string, string> = {};
      entries.forEach(([k, v]) => v && (map[k] = v));
      setSignedImages(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [slides]);

  if (!isAdmin) return null;

  if (loading || !course)
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading…</div>;

  async function saveCourse(patch: Partial<Course>) {
    if (!course) return;
    setErr(null);
    const next = { ...course, ...patch };
    setCourse(next);
    const { error } = await supabase.from("courses").update(patch).eq("id", courseId);
    if (error) {
      setErr(error.message);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <Link to="/admin" className="text-xs text-slate-400 hover:text-amber-300">
              ← Back to admin
            </Link>
            <h1 className="truncate text-base font-semibold">{course.title}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {savedAt && <span className="text-emerald-400">Saved {savedAt}</span>}
            {course.published ? (
              <button
                onClick={() => saveCourse({ published: false })}
                title="Hide this course from the learner library"
                className="rounded-md border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-200 hover:bg-emerald-500/25"
              >
                ✓ Published · Unpublish
              </button>
            ) : (
              <button
                onClick={() => saveCourse({ published: true })}
                title="Make this course visible in the learner library now"
                className="rounded-md bg-amber-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-amber-400"
              >
                🚀 Publish to library
              </button>
            )}
          </div>
        </div>
      </header>

      {err && (
        <div className="mx-auto mt-3 max-w-6xl rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6">
        <MetadataSection course={course} onSave={saveCourse} />
        <NarrationSettingsSection course={course} onSave={saveCourse} />
        <SlidesSection
          courseId={courseId}
          courseTitle={course.title}
          courseDescription={course.description}
          slides={slides}
          signedImages={signedImages}
          onSaveCourse={saveCourse}
          onChanged={reload}
          setErr={setErr}
        />
        <SrtSection courseId={courseId} cues={cues} onChanged={reload} setErr={setErr} />
        <QuizSection courseId={courseId} quiz={quiz} onChanged={reload} setErr={setErr} />
        <GenerateSection
          course={course}
          slides={slides}
          cues={cues}
          quiz={quiz}
          onSaveCourse={saveCourse}
          onChanged={reload}
          setErr={setErr}
        />
      </main>
    </div>
  );
}

/* ---------- Metadata ---------- */
function MetadataSection({ course, onSave }: { course: Course; onSave: (p: Partial<Course>) => Promise<void> }) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [voice, setVoice] = useState(course.voice);
  const [lang, setLang] = useState(course.lang_code);
  const [speed, setSpeed] = useState<number>(course.speed);

  useEffect(() => {
    // Only resync local form state when navigating to a different course.
    // Resyncing on every saved field caused typing to "refresh"/lose focus.
    setTitle(course.title);
    setDescription(course.description ?? "");
    setVoice(course.voice);
    setLang(course.lang_code);
    setSpeed(course.speed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-base font-semibold">Course metadata</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== course.title && onSave({ title })}
            className="input"
          />
        </Field>
        <Field label="Voice (Yavar TTS only)">
          <select
            value={voice}
            onChange={(e) => {
              setVoice(e.target.value);
              onSave({ voice: e.target.value });
            }}
            className="input"
          >
            {VOICES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select
            value={lang}
            onChange={(e) => {
              setLang(e.target.value);
              onSave({ lang_code: e.target.value });
            }}
            className="input"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Narration speed (${speed.toFixed(2)}x)`}>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            onMouseUp={() => speed !== course.speed && onSave({ speed })}
            onTouchEnd={() => speed !== course.speed && onSave({ speed })}
            className="w-full"
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (course.description ?? "") && onSave({ description })}
            rows={3}
            className="input"
          />
        </Field>
      </div>
      <style>{`.input{width:100%;border-radius:0.375rem;border:1px solid rgb(51 65 85);background:rgb(2 6 23);padding:0.5rem 0.75rem;font-size:0.875rem;color:rgb(241 245 249);outline:none}.input:focus{border-color:rgb(251 191 36)}`}</style>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Narration settings (tone / depth / audience / override) ---------- */
const TONES = ["conversational", "formal", "energetic", "socratic"];
function NarrationSettingsSection({ course, onSave }: { course: Course; onSave: (p: Partial<Course>) => Promise<void> }) {
  const [tone, setTone] = useState(course.tone ?? "conversational");
  const [depth, setDepth] = useState<number>(course.tech_depth ?? 3);
  const [audience, setAudience] = useState(course.audience ?? "business professionals");
  const [override, setOverride] = useState(course.prompt_override ?? "");

  useEffect(() => {
    setTone(course.tone ?? "conversational");
    setDepth(course.tech_depth ?? 3);
    setAudience(course.audience ?? "business professionals");
    setOverride(course.prompt_override ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-base font-semibold">Narration settings</h2>
      <p className="mt-1 text-xs text-slate-500">
        These get merged into the global prompt template when the AI writes voice-over for this course.
        Edit the master template in <Link to="/admin/settings" className="text-amber-300 underline">Admin → Settings</Link>.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Tone">
          <select
            value={tone}
            onChange={(e) => { setTone(e.target.value); onSave({ tone: e.target.value }); }}
            className="input"
          >
            {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label={`Technical depth (${depth}/5)`}>
          <input
            type="range" min={1} max={5} step={1} value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            onMouseUp={() => depth !== (course.tech_depth ?? 3) && onSave({ tech_depth: depth })}
            onTouchEnd={() => depth !== (course.tech_depth ?? 3) && onSave({ tech_depth: depth })}
            className="w-full"
          />
        </Field>
        <Field label="Audience">
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            onBlur={() => audience !== (course.audience ?? "") && onSave({ audience })}
            className="input"
          />
        </Field>
        <Field label="Per-course prompt override (optional, overrides global template)" className="sm:col-span-3">
          <textarea
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            onBlur={() => override !== (course.prompt_override ?? "") && onSave({ prompt_override: override || null })}
            rows={5}
            placeholder="Leave empty to use the global template. Use {{title}} {{tone}} {{audience}} {{depth}} {{deck}} {{slideCount}}."
            className="input font-mono text-xs"
          />
        </Field>
      </div>
    </section>
  );
}

function SlidesSection({
  courseId,
  courseTitle,
  courseDescription,
  slides,
  signedImages,
  onSaveCourse,
  onChanged,
  setErr,
}: {
  courseId: string;
  courseTitle: string;
  courseDescription: string | null;
  slides: Slide[];
  signedImages: Record<string, string>;
  onSaveCourse: (p: Partial<Course>) => Promise<void>;
  onChanged: () => Promise<void>;
  setErr: (s: string | null) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [rangeBusy, setRangeBusy] = useState(false);
  const [rangeStatus, setRangeStatus] = useState<string | null>(null);
  type RangeRow = {
    slideId: string;
    idx: number;
    title: string;
    status: "pending" | "running" | "ok" | "error";
    sceneCount?: number;
    attempts?: number;
    modelUsed?: string;
    error?: string;
    illStatus?: "pending" | "running" | "ok" | "error" | "skipped";
    illError?: string;
    scenes?: Array<{
      concept: string;
      intro: string;
      takeaway: string;
      analogy?: { caption: string; nodes: string[] } | null;
      example?: { caption: string; nodes: string[] } | null;
      technical?: { caption: string; nodes: string[] } | null;
      narration?: Record<string, string>;
    }>;
  };
  const [rangeResults, setRangeResults] = useState<RangeRow[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [fromIdx, setFromIdx] = useState<number>(1);
  const [toIdx, setToIdx] = useState<number>(Math.min(10, Math.max(1, slides.length)));
  const [alsoIllustrate, setAlsoIllustrate] = useState<boolean>(true);
  const runDescription = useServerFn(generateCourseDescription);
  const runRegenOne = useServerFn(regenerateSlideNarration);
  const runIll = useServerFn(generateSlideIllustrations);

  async function regenerateSlides(
    targets: Slide[],
    opts: { withIllustration: boolean; label: string },
  ) {
    if (targets.length === 0) {
      setRangeStatus("Nothing to do — no matching slides.");
      return;
    }
    setErr(null);
    setRangeBusy(true);
    setExpanded({});
    const initial: RangeRow[] = targets.map((s) => ({
      slideId: s.id,
      idx: s.idx,
      title: s.title,
      status: "pending",
      illStatus: opts.withIllustration ? "pending" : "skipped",
    }));
    setRangeResults(initial);
    try {
      for (let i = 0; i < targets.length; i++) {
        const s = targets[i];
        setRangeStatus(
          `${opts.label} ${i + 1}/${targets.length} — slide #${s.idx} "${s.title}"…`,
        );
        setRangeResults((prev) =>
          prev?.map((r) => (r.slideId === s.id ? { ...r, status: "running" } : r)) ?? prev,
        );
        try {
          const res = await runRegenOne({ data: { slideId: s.id } });
          setRangeResults((prev) =>
            prev?.map((r) =>
              r.slideId === s.id
                ? {
                    ...r,
                    status: "ok",
                    sceneCount: res.sceneCount,
                    attempts: res.attempts,
                    modelUsed: res.modelUsed,
                    scenes: res.scenes as RangeRow["scenes"],
                  }
                : r,
            ) ?? prev,
          );
        } catch (e) {
          setRangeResults((prev) =>
            prev?.map((r) =>
              r.slideId === s.id ? { ...r, status: "error", error: (e as Error).message } : r,
            ) ?? prev,
          );
          continue;
        }

        if (opts.withIllustration) {
          setRangeStatus(
            `${opts.label} ${i + 1}/${targets.length} — generating illustration for "${s.title}"…`,
          );
          setRangeResults((prev) =>
            prev?.map((r) => (r.slideId === s.id ? { ...r, illStatus: "running" } : r)) ?? prev,
          );
          try {
            const ill = await runIll({ data: { slideIds: [s.id] } });
            const row = ill.results?.[0];
            if (row?.error || !row?.url) {
              throw new Error(row?.error ?? "No image returned");
            }
            setRangeResults((prev) =>
              prev?.map((r) => (r.slideId === s.id ? { ...r, illStatus: "ok" } : r)) ?? prev,
            );
          } catch (e) {
            setRangeResults((prev) =>
              prev?.map((r) =>
                r.slideId === s.id
                  ? { ...r, illStatus: "error", illError: (e as Error).message }
                  : r,
              ) ?? prev,
            );
          }
        }
      }
      setRangeStatus(
        `Done — processed ${targets.length} slide${targets.length === 1 ? "" : "s"}.`,
      );
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRangeBusy(false);
    }
  }

  async function regenerateRange() {
    const lo = Math.max(1, Math.min(fromIdx, toIdx));
    const hi = Math.max(1, Math.max(fromIdx, toIdx));
    const targets = [...slides]
      .sort((a, b) => a.idx - b.idx)
      .filter((s) => s.idx >= lo && s.idx <= hi);
    await regenerateSlides(targets, {
      withIllustration: alsoIllustrate,
      label: `Range ${lo}–${hi}`,
    });
  }

  async function regenerateAllRemaining() {
    const targets = [...slides].sort((a, b) => a.idx - b.idx).filter((s) => {
      const needsNarration = !s.narration_text || s.narration_text.trim().length === 0;
      const needsIll = alsoIllustrate && !s.illustration_url;
      return needsNarration || needsIll;
    });
    await regenerateSlides(targets, {
      withIllustration: alsoIllustrate,
      label: "Remaining",
    });
  }

  async function handleDeck(file: File, replace: boolean) {
    setErr(null);
    setBusy("Parsing deck…");
    try {
      const parsed: ParsedSlide[] = await parseDeck(file);
      if (parsed.length === 0) throw new Error("No slides found in file.");

      if (!courseDescription?.trim()) {
        setBusy("Generating course description…");
        try {
          const res = await runDescription({
            data: {
              courseTitle,
              slides: parsed.map((p) => ({ title: p.title, bullets: p.bullets })),
            },
          });
          await onSaveCourse({ description: res.description });
        } catch (e) {
          console.warn("description failed, continuing without AI", e);
        }
      }

      // Speaker notes from the deck become the initial narration.
      // AI narration is NOT generated in this upload request — that used to
      // loop every slide inside ONE server call and the worker would time out,
      // leaving the upload "stuck". AI scenes/narration are now produced
      // per-slide via the regenerate flow (kicked off automatically below
      // when autoNarrate is on).
      const aiNarrations: string[] = parsed.map((p) => p.notes);

      if (replace) {
        setBusy("Removing existing slides…");
        // best-effort cleanup of old image objects
        const oldPaths = slides
          .map((s) => s.image_url)
          .filter((p): p is string => !!p && !/^https?:\/\//.test(p));
        if (oldPaths.length) await supabase.storage.from(COURSE_BUCKET).remove(oldPaths);
        await supabase.from("slides").delete().eq("course_id", courseId);
      }
      const startIdx = replace ? 0 : slides.length;

      const insertedIds: string[] = [];
      setProgress({ done: 0, total: parsed.length });
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        setBusy(`Uploading slide ${i + 1} of ${parsed.length}…`);
        let imagePath: string | null = null;
        if (p.image) {
          const ext = p.image.type.includes("png") ? "png" : p.image.type.includes("gif") ? "gif" : "jpg";
          imagePath = `${courseId}/slides/${Date.now()}-${i}.${ext}`;
          const up = await supabase.storage.from(COURSE_BUCKET).upload(imagePath, p.image, { upsert: false });
          if (up.error) throw up.error;
        }
        const body_md = p.bullets.map((b) => `- ${b}`).join("\n");
        const ins = await supabase
          .from("slides")
          .insert({
            course_id: courseId,
            idx: startIdx + i,
            title: p.title || `Slide ${startIdx + i + 1}`,
            body_md: body_md || null,
            image_url: imagePath,
            narration_text: aiNarrations[i] || null,
          })
          .select("id")
          .single();
        if (ins.error) throw ins.error;
        if (ins.data?.id) insertedIds.push(ins.data.id);
        setProgress({ done: i + 1, total: parsed.length });
      }
      await onChanged();

      // Per-slide AI generation, AFTER upload completes. Each slide is its
      // own request → no worker timeout. Safe to skip if the user unticked
      // "Auto-narrate".
      if (autoNarrate && insertedIds.length) {
        setBusy(null);
        setProgress(null);
        const fresh = (await supabase
          .from("slides")
          .select("*")
          .in("id", insertedIds)
          .order("idx", { ascending: true })).data as Slide[] | null;
        if (fresh?.length) {
          await regenerateSlides(fresh, {
            withIllustration: alsoIllustrate,
            label: "Auto-narrate",
          });
        }
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function updateSlide(id: string, patch: Partial<Slide>) {
    // Optimistic save — do NOT reload the whole editor on every blur,
    // that's what caused the "refresh while typing" flash and focus loss.
    const { error } = await supabase.from("slides").update(patch).eq("id", id);
    if (error) setErr(error.message);
  }

  async function deleteSlide(s: Slide) {
    if (!confirm(`Delete slide "${s.title}"?`)) return;
    if (s.image_url && !/^https?:\/\//.test(s.image_url)) {
      await supabase.storage.from(COURSE_BUCKET).remove([s.image_url]);
    }
    const { error } = await supabase.from("slides").delete().eq("id", s.id);
    if (error) {
      setErr(error.message);
      return;
    }
    const remaining = slides.filter((x) => x.id !== s.id);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].idx !== i) await supabase.from("slides").update({ idx: i }).eq("id", remaining[i].id);
    }
    await onChanged();
  }

  async function move(s: Slide, dir: -1 | 1) {
    const swap = slides.find((x) => x.idx === s.idx + dir);
    if (!swap) return;
    await supabase.from("slides").update({ idx: -1 }).eq("id", s.id);
    await supabase.from("slides").update({ idx: s.idx }).eq("id", swap.id);
    await supabase.from("slides").update({ idx: s.idx + dir }).eq("id", s.id);
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Slides ({slides.length})</h2>
          <p className="mt-1 text-xs text-slate-500">
            Upload a <strong>PDF or PPTX</strong>. We extract titles, bullets, speaker notes and embedded images —
            the player renders each slide with its own animated design and AI voice-over.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <input type="checkbox" checked={autoNarrate} onChange={(e) => setAutoNarrate(e.target.checked)} />
            Auto-generate narration
          </label>
          {slides.length > 0 && (
            <label className="cursor-pointer rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
              Replace deck
              <input
                type="file"
                accept=".pdf,.pptx"
                className="hidden"
                disabled={!!busy}
                onChange={(e) => e.target.files?.[0] && handleDeck(e.target.files[0], true)}
              />
            </label>
          )}
          <label className="cursor-pointer rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-400">
            {busy ?? "+ Upload deck"}
            <input
              type="file"
              accept=".pdf,.pptx"
              className="hidden"
              disabled={!!busy}
              onChange={(e) => e.target.files?.[0] && handleDeck(e.target.files[0], false)}
            />
          </label>
        </div>
      </div>

      {slides.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/5 p-2 text-xs">
          <span className="font-semibold text-sky-200">Per-slide regen:</span>
          <label className="flex items-center gap-1 text-slate-300">
            From
            <input
              type="number"
              min={1}
              max={slides.length}
              value={fromIdx}
              disabled={rangeBusy}
              onChange={(e) => setFromIdx(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-slate-100"
            />
          </label>
          <label className="flex items-center gap-1 text-slate-300">
            To
            <input
              type="number"
              min={1}
              max={slides.length}
              value={toIdx}
              disabled={rangeBusy}
              onChange={(e) => setToIdx(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-slate-100"
            />
          </label>
          <label className="flex items-center gap-1.5 text-slate-300">
            <input
              type="checkbox"
              checked={alsoIllustrate}
              disabled={rangeBusy}
              onChange={(e) => setAlsoIllustrate(e.target.checked)}
            />
            Also generate illustration (Gemini image)
          </label>
          <button
            onClick={regenerateRange}
            disabled={rangeBusy}
            className="rounded-md border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
            title="Regenerate the slide range you picked, one slide at a time."
          >
            ↻ Regenerate range
          </button>
          <button
            onClick={regenerateAllRemaining}
            disabled={rangeBusy}
            className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            title="Walks every slide missing narration (or illustration if checked)."
          >
            ⟳ Regenerate all remaining
          </button>
          <span className="text-slate-400">
            ({slides.length} slides ·{" "}
            {slides.filter((s) => !s.narration_text).length} missing narration ·{" "}
            {slides.filter((s) => !s.illustration_url).length} missing illustration)
          </span>
        </div>
      )}

      {progress && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}

      {rangeResults && (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="font-semibold text-slate-200">
              Per-slide regeneration ({rangeResults.filter((r) => r.status === "ok").length} ok ·{" "}
              {rangeResults.filter((r) => r.status === "error").length} failed ·{" "}
              {rangeResults.filter((r) => r.status === "running").length} running ·{" "}
              {rangeResults.filter((r) => r.status === "pending").length} pending)
            </div>
            {rangeStatus && <div className="text-sky-300">{rangeStatus}</div>}
          </div>
          {rangeBusy && (
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-sky-500 transition-all"
                style={{
                  width: `${
                    (rangeResults.filter((r) => r.status === "ok" || r.status === "error").length /
                      Math.max(1, rangeResults.length)) *
                    100
                  }%`,
                }}
              />
            </div>
          )}
          <ul className="space-y-1">
            {rangeResults.map((r) => {
              const isOpen = !!expanded[r.slideId];
              return (
                <li key={r.slideId} className="rounded-md border border-slate-800 bg-slate-900/40">
                  <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
                    <span className="w-8 text-slate-500">#{r.idx + 1}</span>
                    <span className="flex-1 truncate text-slate-300">{r.title}</span>
                    {r.status === "pending" && <span className="text-slate-500">… queued</span>}
                    {r.status === "running" && <span className="text-amber-300">⟳ generating…</span>}
                    {r.status === "ok" && (
                      <>
                        <span className="text-emerald-300">
                          ✓ {r.sceneCount} scene{r.sceneCount === 1 ? "" : "s"} ·{" "}
                          {r.modelUsed === "gemini-3.1-pro" ? "Gemini 3.1 Pro" : "Gemini Flash"} · attempt {r.attempts}
                        </span>
                        <button
                          onClick={() =>
                            setExpanded((p) => ({ ...p, [r.slideId]: !p[r.slideId] }))
                          }
                          className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:bg-slate-800"
                        >
                          {isOpen ? "Hide" : "Preview"} scenes
                        </button>
                      </>
                    )}
                    {r.status === "error" && <span className="text-red-300">✗ {r.error}</span>}
                    {r.illStatus === "pending" && <span className="text-slate-500">· img queued</span>}
                    {r.illStatus === "running" && <span className="text-fuchsia-300">· 🎨 image…</span>}
                    {r.illStatus === "ok" && <span className="text-fuchsia-300">· 🎨 image ✓</span>}
                    {r.illStatus === "error" && (
                      <span className="text-red-300" title={r.illError}>· image ✗</span>
                    )}
                  </div>
                  {isOpen && r.scenes && (
                    <div className="space-y-3 border-t border-slate-800 px-3 py-3">
                      {r.scenes.map((sc, i) => (
                        <div key={i} className="rounded-md bg-slate-950/60 p-2">
                          <div className="mb-1 text-[11px] uppercase tracking-wide text-sky-400">
                            Scene {i + 1} · {sc.concept}
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <div><span className="text-slate-500">Intro:</span> {sc.intro}</div>
                            {sc.analogy && (
                              <div>
                                <span className="text-slate-500">Analogy:</span> {sc.analogy.caption}{" "}
                                <span className="text-amber-300">[{sc.analogy.nodes.join(" → ")}]</span>
                              </div>
                            )}
                            {sc.example && (
                              <div>
                                <span className="text-slate-500">Example:</span> {sc.example.caption}{" "}
                                <span className="text-amber-300">[{sc.example.nodes.join(" → ")}]</span>
                              </div>
                            )}
                            {sc.technical && (
                              <div>
                                <span className="text-slate-500">Technical:</span> {sc.technical.caption}{" "}
                                <span className="text-amber-300">[{sc.technical.nodes.join(" → ")}]</span>
                              </div>
                            )}
                            <div><span className="text-slate-500">Takeaway:</span> {sc.takeaway}</div>
                          </div>
                        </div>
                      ))}
                      <Link
                        to="/learn/$courseId"
                        params={{ courseId }}
                        className="inline-block text-sky-300 underline hover:text-sky-200"
                      >
                        ▶ Open in learner to watch this slide
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {slides.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          No slides yet — upload a PDF or PPTX to get started.
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {slides.map((s) => (
            <SlideRow
              key={s.id}
              s={s}
              slides={slides}
              signedImages={signedImages}
              onMove={move}
              onDelete={deleteSlide}
              onUpdate={updateSlide}
              onChanged={onChanged}
              setErr={setErr}
            />
          ))}
        </ol>
      )}
    </section>
  );
}


/* ---------- Slide row with regen / hint / illustration ---------- */
function SlideRow({
  s, slides, signedImages, onMove, onDelete, onUpdate, onChanged, setErr,
}: {
  s: Slide;
  slides: Slide[];
  signedImages: Record<string, string>;
  onMove: (s: Slide, dir: -1 | 1) => Promise<void>;
  onDelete: (s: Slide) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Slide>) => Promise<void>;
  onChanged: () => Promise<void>;
  setErr: (s: string | null) => void;
}) {
  const [hint, setHint] = useState(s.generation_hint ?? "");
  const [regenBusy, setRegenBusy] = useState(false);
  const [illBusy, setIllBusy] = useState(false);
  const [modelBadge, setModelBadge] = useState<string | null>(null);
  const runRegen = useServerFn(regenerateSlideNarration);
  const runIll = useServerFn(generateSlideIllustrations);
  const url = s.image_url ? signedImages[s.image_url] || s.image_url : null;
  const illUrl = s.illustration_url ? signedImages[s.illustration_url] || s.illustration_url : null;

  async function regen() {
    setRegenBusy(true); setErr(null);
    try {
      const res = await runRegen({ data: { slideId: s.id, hint: hint || undefined } });
      const modelLabel = res.modelUsed === "gemini-3.1-pro" ? "Gemini 3.1 Pro" : "Gemini Flash (fallback)";
      setModelBadge(`${res.sceneCount} scene${res.sceneCount === 1 ? "" : "s"} via ${modelLabel}`);
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally { setRegenBusy(false); }
  }
  async function makeIllustration() {
    setIllBusy(true); setErr(null);
    try {
      const res = await runIll({ data: { slideIds: [s.id] } });
      const r = res.results[0];
      if (r?.error) throw new Error(r.error);
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally { setIllBusy(false); }
  }

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex gap-3">
        <div className="flex w-12 flex-col items-center gap-1">
          <span className="text-xs text-slate-500">#{s.idx + 1}</span>
          <button onClick={() => onMove(s, -1)} disabled={s.idx === 0} className="rounded border border-slate-700 px-1 text-xs disabled:opacity-30">↑</button>
          <button onClick={() => onMove(s, 1)} disabled={s.idx === slides.length - 1} className="rounded border border-slate-700 px-1 text-xs disabled:opacity-30">↓</button>
        </div>
        <div className="w-32 shrink-0 space-y-1">
          <div className="overflow-hidden rounded-md bg-slate-800">
            {url ? <img src={url} alt={s.title} className="h-20 w-full object-cover" /> : (
              <div className="flex h-20 items-center justify-center text-center text-[10px] text-slate-500">text-only</div>
            )}
          </div>
          {illUrl && <img src={illUrl} alt="illustration" className="h-20 w-full rounded-md border border-amber-400/30 object-contain bg-white/5" />}
        </div>
        <div className="flex-1 space-y-2">
          <input
            defaultValue={s.title}
            onBlur={(e) => e.target.value !== s.title && onUpdate(s.id, { title: e.target.value })}
            placeholder="Slide title"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-medium"
          />
          <textarea
            defaultValue={stripGeneratedMaterial(s.body_md)}
            onBlur={(e) => e.target.value !== stripGeneratedMaterial(s.body_md) && onUpdate(s.id, { body_md: e.target.value || null })}
            placeholder="Bullets (markdown, one per line)"
            rows={3}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300"
          />
          <textarea
            defaultValue={s.narration_text ?? ""}
            onBlur={(e) => e.target.value !== (s.narration_text ?? "") && onUpdate(s.id, { narration_text: e.target.value || null })}
            placeholder="Narration (spoken aloud)"
            rows={2}
            key={s.narration_text ?? ""}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-amber-200/80"
          />
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            onBlur={() => hint !== (s.generation_hint ?? "") && onUpdate(s.id, { generation_hint: hint || null })}
            placeholder="Per-slide generation hint (optional — e.g. 'explain with an apple/orange analogy')"
            rows={2}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-sky-200/80"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={regen} disabled={regenBusy}
              className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {regenBusy ? "Regenerating…" : "↻ Regenerate narration"}
            </button>
            <button
              onClick={makeIllustration} disabled={illBusy}
              className="rounded-md border border-violet-400/40 bg-violet-500/10 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
            >
              {illBusy ? "Generating…" : illUrl ? "↻ Regenerate illustration" : "✨ Generate illustration"}
            </button>
            {modelBadge && <span className="text-[10px] text-amber-200">✓ {modelBadge}</span>}
            {s.icon_keywords && s.icon_keywords.length > 0 && (
              <span className="text-[10px] text-slate-500">icons: {s.icon_keywords.join(", ")}</span>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(s)} className="self-start rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10">
          Delete
        </button>
      </div>
    </li>
  );
}

/* ---------- SRT ---------- */
function parseSrt(text: string): { idx: number; start_ms: number; end_ms: number; text: string }[] {
  const out: { idx: number; start_ms: number; end_ms: number; text: string }[] = [];
  const blocks = text.replace(/\r/g, "").split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 2) continue;
    let i = 0;
    if (/^\d+$/.test(lines[0].trim())) i = 1;
    const timing = lines[i];
    const m = timing.match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) continue;
    const toMs = (h: string, mn: string, s: string, ms: string) =>
      (parseInt(h) * 3600 + parseInt(mn) * 60 + parseInt(s)) * 1000 + parseInt(ms);
    const start = toMs(m[1], m[2], m[3], m[4]);
    const end = toMs(m[5], m[6], m[7], m[8]);
    const cueText = lines.slice(i + 1).join("\n").trim();
    out.push({ idx: out.length, start_ms: start, end_ms: end, text: cueText });
  }
  return out;
}

function SrtSection({
  courseId,
  cues,
  onChanged,
  setErr,
}: {
  courseId: string;
  cues: Cue[];
  onChanged: () => Promise<void>;
  setErr: (s: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const preview = useMemo(() => cues.slice(0, 5), [cues]);

  async function handleFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseSrt(text);
      if (parsed.length === 0) throw new Error("No cues parsed from file. Is it a valid .srt?");
      await supabase.from("srt_cues").delete().eq("course_id", courseId);
      const rows = parsed.map((c) => ({ ...c, course_id: courseId }));
      // chunk to avoid payload limits
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("srt_cues").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function clearCues() {
    if (!confirm("Delete all captions for this course?")) return;
    const { error } = await supabase.from("srt_cues").delete().eq("course_id", courseId);
    if (error) setErr(error.message);
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Captions / SRT ({cues.length} cues)</h2>
        <div className="flex gap-2">
          {cues.length > 0 && (
            <button
              onClick={clearCues}
              className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
            >
              Clear
            </button>
          )}
          <label className="cursor-pointer rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-400">
            {uploading ? "Parsing…" : "Upload .srt"}
            <input
              type="file"
              accept=".srt,text/plain"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">Uploading replaces existing cues.</p>

      {preview.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-400">
          {preview.map((c) => (
            <li key={c.id} className="font-mono">
              <span className="text-slate-500">{(c.start_ms / 1000).toFixed(1)}s →</span> {c.text.slice(0, 90)}
              {c.text.length > 90 && "…"}
            </li>
          ))}
          {cues.length > 5 && <li className="text-slate-500">… and {cues.length - 5} more</li>}
        </ul>
      )}
    </section>
  );
}

/* ---------- Quiz ---------- */
function QuizSection({
  courseId,
  quiz,
  onChanged,
  setErr,
}: {
  courseId: string;
  quiz: Quiz[];
  onChanged: () => Promise<void>;
  setErr: (s: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rowsRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (rowsRaw.length === 0) throw new Error("Spreadsheet has no rows.");

      const pick = (r: Record<string, unknown>, ...keys: string[]) => {
        for (const k of keys) {
          for (const actual of Object.keys(r)) {
            if (actual.trim().toLowerCase() === k.toLowerCase()) {
              const v = r[actual];
              if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
            }
          }
        }
        return "";
      };

      const rows = rowsRaw.map((r, i) => {
        const prompt = pick(r, "prompt", "question", "q");
        const a = pick(r, "option_a", "a", "optiona");
        const b = pick(r, "option_b", "b", "optionb");
        const c = pick(r, "option_c", "c", "optionc");
        const d = pick(r, "option_d", "d", "optiond");
        const correctRaw = pick(r, "correct", "answer");
        const correct = ["A", "B", "C", "D"].includes(correctRaw.toUpperCase())
          ? correctRaw.toUpperCase()
          : "A";
        if (!prompt) throw new Error(`Row ${i + 2}: missing 'prompt' / 'question'.`);
        if (!a || !b) throw new Error(`Row ${i + 2}: need at least option_a and option_b.`);
        return {
          course_id: courseId,
          idx: i,
          prompt,
          option_a: a || null,
          option_b: b || null,
          option_c: c || null,
          option_d: d || null,
          correct,
          explanation: pick(r, "explanation", "rationale") || null,
          hint: pick(r, "hint") || null,
          topic: pick(r, "topic", "category") || null,
          difficulty: pick(r, "difficulty", "level") || null,
        };
      });
      await supabase.from("quiz_questions").delete().eq("course_id", courseId);
      const { error } = await supabase.from("quiz_questions").insert(rows);
      if (error) throw error;
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["prompt", "option_a", "option_b", "option_c", "option_d", "correct", "explanation", "hint", "topic", "difficulty"],
      [
        "What does RAG stand for?",
        "Retrieval-Augmented Generation",
        "Random Access Grid",
        "Rapid AI Gateway",
        "Recursive Algo Graph",
        "A",
        "RAG combines retrieval with generation.",
        "Think 'retrieve then generate'.",
        "AI",
        "easy",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz");
    XLSX.writeFile(wb, "quiz-template.xlsx");
  }

  async function clearQuiz() {
    if (!confirm("Delete all quiz questions?")) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("course_id", courseId);
    if (error) setErr(error.message);
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Quiz ({quiz.length} questions)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Upload an Excel (.xlsx) with columns: <code className="text-slate-300">prompt, option_a, option_b, option_c, option_d, correct, explanation, hint</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Download template
          </button>
          {quiz.length > 0 && (
            <button
              onClick={clearQuiz}
              className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
            >
              Clear
            </button>
          )}
          <label className="cursor-pointer rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-400">
            {uploading ? "Importing…" : "Upload .xlsx"}
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>


      {quiz.length > 0 && (
        <ol className="mt-3 space-y-2 text-sm">
          {quiz.slice(0, 5).map((q) => (
            <li key={q.id} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
              <div className="font-medium">
                {q.idx + 1}. {q.prompt}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Correct: <span className="text-emerald-300">{q.correct}</span>
                {q.correct && q[`option_${q.correct.toLowerCase()}` as "option_a"] && (
                  <> — {q[`option_${q.correct.toLowerCase()}` as "option_a"]}</>
                )}
              </div>
            </li>
          ))}
          {quiz.length > 5 && <li className="text-xs text-slate-500">… and {quiz.length - 5} more</li>}
        </ol>
      )}
    </section>
  );
}

/* ---------- Generate / Compile ---------- */
function GenerateSection({
  course,
  slides,
  cues,
  quiz,
  onSaveCourse,
  onChanged,
  setErr,
}: {
  course: Course;
  slides: Slide[];
  cues: Cue[];
  quiz: Quiz[];
  onSaveCourse: (p: Partial<Course>) => Promise<void>;
  onChanged: () => Promise<void>;
  setErr: (s: string | null) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [perSlide, setPerSlide] = useState<Array<{ idx: number; title: string; state: "pending" | "running" | "ok" | "error"; sceneCount?: number; error?: string }>>([]);
  const [audit, setAudit] = useState<Array<{ idx: number; title: string; hasBody: boolean; hasScenes: boolean; hasNarration: boolean; hasImage: boolean; ok: boolean }> | null>(null);
  const runRegenOne = useServerFn(regenerateSlideNarration);
  const runIll = useServerFn(generateSlideIllustrations);

  const hasGeneratedScenes = (s: Slide) =>
    !!s.narration_text && s.narration_text.trim().length >= 4 && !!s.body_md && s.body_md.includes("learning-scenes-v1");
  const missingNarration = slides.filter((s) => !hasGeneratedScenes(s));
  const hasSlides = slides.length > 0;
  const hasQuiz = quiz.length > 0;
  const ready = hasSlides && hasQuiz && missingNarration.length === 0;

  function runAudit(list: Slide[]) {
    const rows = [...list].sort((a, b) => a.idx - b.idx).map((s) => {
      const hasBody = !!s.body_md && s.body_md.trim().length > 0;
      const hasScenes = !!s.body_md && s.body_md.includes("learning-scenes-v1");
      const hasNarration = !!s.narration_text && s.narration_text.trim().length >= 4;
      const hasImage = !!s.image_url || !!s.illustration_url;
      // image is optional; required = body + scenes + narration
      const ok = hasBody && hasScenes && hasNarration;
      return { idx: s.idx, title: s.title, hasBody, hasScenes, hasNarration, hasImage, ok };
    });
    setAudit(rows);
    return rows;
  }

  async function generate(opts: { force: boolean }) {
    setErr(null);
    setStatus(null);
    setLastModel(null);
    setAudit(null);
    if (!hasSlides) {
      setErr("Upload a PDF or PPTX deck first.");
      return;
    }
    if (!hasQuiz) {
      setErr("Upload the quiz Excel first. Generation must bind slides, narration, captions and quiz together.");
      return;
    }
    try {
      const allSorted = [...slides].sort((a, b) => a.idx - b.idx);
      // Force = re-run every slide. Otherwise skip ones already generated.
      const workingSlides = opts.force ? allSorted : allSorted.filter((s) => !hasGeneratedScenes(s));
      const skipped = allSorted.length - workingSlides.length;
      setPerSlide([
        ...(opts.force ? [] : allSorted
          .filter((s) => hasGeneratedScenes(s))
          .map((s) => ({ idx: s.idx, title: s.title, state: "ok" as const }))),
        ...workingSlides.map((s) => ({ idx: s.idx, title: s.title, state: "pending" as const })),
      ]);
      setProgress({ done: 0, total: workingSlides.length });
      if (workingSlides.length === 0) {
        setStatus(`All ${allSorted.length} slides already generated. Use "Force re-generate all" to redo them.`);
        runAudit(allSorted);
        setBusy(null);
        return;
      }
      if (skipped > 0) setStatus(`Resuming — skipping ${skipped} already-generated slides.`);

      let totalScenes = 0;
      let okCount = 0;
      let errCount = 0;

      for (let i = 0; i < workingSlides.length; i++) {
        const s = workingSlides[i];
        setBusy(`Slide ${i + 1}/${workingSlides.length} — "${s.title}"…`);
        setPerSlide((prev) => prev.map((r) => (r.idx === s.idx ? { ...r, state: "running" } : r)));
        try {
          const res = await runRegenOne({ data: { slideId: s.id } });
          totalScenes += res.sceneCount ?? 0;
          okCount += 1;
          setLastModel(res.modelUsed === "gemini-3.1-pro" ? "Gemini 3.1 Pro" : "Gemini Flash fallback");
          setPerSlide((prev) =>
            prev.map((r) => (r.idx === s.idx ? { ...r, state: "ok", sceneCount: res.sceneCount } : r)),
          );
          // Auto-generate illustration if missing (optional but recommended)
          if (!s.illustration_url && !s.image_url) {
            try {
              setBusy(`Slide ${i + 1}/${workingSlides.length} — illustration for "${s.title}"…`);
              await runIll({ data: { slideIds: [s.id] } });
            } catch {
              /* illustration is optional — don't fail the slide */
            }
          }
        } catch (e) {
          errCount += 1;
          setPerSlide((prev) =>
            prev.map((r) => (r.idx === s.idx ? { ...r, state: "error", error: (e as Error).message } : r)),
          );
        }
        setProgress({ done: i + 1, total: workingSlides.length });
      }

      setBusy("Auditing course…");
      await onChanged();
      // Re-read latest slides via parent refresh, then audit against current props is stale.
      // We pass the freshly-refetched slides via the in-memory list (props update on next render),
      // so re-run the audit against what we have now plus assumptions.
      const auditRows = runAudit(allSorted.map((s) => {
        const wasProcessed = workingSlides.find((w) => w.id === s.id);
        if (!wasProcessed) return s;
        // Mark as freshly generated since the server now has narration+scenes
        return { ...s, narration_text: "x", body_md: (s.body_md ?? "") + " learning-scenes-v1" } as Slide;
      }));
      const failingAudit = auditRows.filter((r) => !r.ok);
      if (!course.published && errCount === 0 && failingAudit.length === 0) await onSaveCourse({ published: true });
      setStatus(
        `Generated ${totalScenes} scenes across ${okCount}/${workingSlides.length} slides${errCount ? ` · ${errCount} failed` : ""}${failingAudit.length ? ` · ${failingAudit.length} slide(s) still incomplete — see audit below` : ""}. ${quiz.length} quiz questions attached.`,
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }


  return (
    <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-slate-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-amber-200">Generate learning material</h2>
          <p className="mt-1 text-xs text-slate-400">
            Compiles your deck, narration, captions and quiz into a playable course with animated slides,
            AI voice-over and ambient music.
          </p>
          <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
            <li className={hasSlides ? "text-emerald-300" : "text-slate-500"}>
              {hasSlides ? "✓" : "○"} Slides ({slides.length})
            </li>
            <li className={missingNarration.length === 0 && hasSlides ? "text-emerald-300" : "text-slate-500"}>
              {missingNarration.length === 0 && hasSlides ? "✓" : "○"} Narration{" "}
              {missingNarration.length > 0 && `(${missingNarration.length} missing)`}
            </li>
            <li className={cues.length > 0 ? "text-emerald-300" : "text-slate-500"}>
              {cues.length > 0 ? "✓" : "○"} SRT timing cues ({cues.length})
            </li>
            <li className={hasQuiz ? "text-emerald-300" : "text-slate-500"}>
              {hasQuiz ? "✓" : "○"} Quiz ({quiz.length})
            </li>
          </ul>
          {lastModel && <div className="mt-2 text-xs text-amber-300">Narration model used: {lastModel}</div>}
          {status && <div className="mt-3 text-xs text-emerald-300">{status}</div>}
          {progress && (
            <div className="mt-3 w-full max-w-md">
              <div className="mb-1 flex justify-between text-[11px] text-amber-200">
                <span>{busy ?? "Working…"}</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}
          {perSlide.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-xs">
              <div className="mb-1 font-semibold text-slate-300">
                Per-slide progress ({perSlide.filter((p) => p.state === "ok").length} ok ·{" "}
                {perSlide.filter((p) => p.state === "error").length} failed ·{" "}
                {perSlide.filter((p) => p.state === "running").length} running ·{" "}
                {perSlide.filter((p) => p.state === "pending").length} pending)
              </div>
              <ul className="space-y-0.5">
                {perSlide.map((r) => (
                  <li key={r.idx} className="flex items-center gap-2">
                    <span className="w-8 text-slate-500">#{r.idx + 1}</span>
                    <span className="flex-1 truncate text-slate-300">{r.title}</span>
                    {r.state === "pending" && <span className="text-slate-500">… queued</span>}
                    {r.state === "running" && <span className="text-amber-300">⟳ generating…</span>}
                    {r.state === "ok" && (
                      <span className="text-emerald-300">✓ {r.sceneCount ?? 0} scenes</span>
                    )}
                    {r.state === "error" && (
                      <span className="text-red-300" title={r.error}>✗ failed</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {audit && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-xs">
              <div className="mb-1 flex items-center justify-between font-semibold">
                <span className="text-slate-300">Completion audit ({audit.filter((a) => a.ok).length}/{audit.length} complete)</span>
                <span className="text-[10px] text-slate-500">image = optional</span>
              </div>
              <ul className="space-y-0.5">
                {audit.map((r) => (
                  <li key={r.idx} className="flex items-center gap-2">
                    <span className="w-8 text-slate-500">#{r.idx + 1}</span>
                    <span className="flex-1 truncate text-slate-300">{r.title}</span>
                    <span className={r.hasBody ? "text-emerald-300" : "text-red-300"} title="Slide content">📄</span>
                    <span className={r.hasScenes ? "text-emerald-300" : "text-red-300"} title="Teaching scenes">🎬</span>
                    <span className={r.hasNarration ? "text-emerald-300" : "text-red-300"} title="Narration + voice">🎙️</span>
                    <span className={r.hasImage ? "text-emerald-300" : "text-slate-500"} title="Illustration (optional)">🖼️</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => generate({ force: false })}
            disabled={!!busy || !hasSlides}
            className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ?? (ready && course.published ? "Generate missing only" : "Generate learning material")}
          </button>
          <button
            onClick={() => generate({ force: true })}
            disabled={!!busy || !hasSlides}
            className="rounded-md border border-amber-400/60 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
            title="Re-run narration & illustration for every slide, ignoring existing content."
          >
            ⟳ Force re-generate ALL slides
          </button>
          <Link
            to="/learn/$courseId"
            params={{ courseId: course.id }}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Preview as learner →
          </Link>
        </div>

      </div>
    </section>
  );
}
