import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuthCtx } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_BUCKET, getSignedUrl } from "@/lib/storage";
import { parseDeck, type ParsedSlide } from "@/lib/deckParser";
import { generateNarrations } from "@/lib/narration.functions";

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
};

const VOICES = ["default", "alloy", "verse", "shimmer", "fable", "nova"];
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
    const paths = slides.map((s) => s.image_url).filter((p): p is string => !!p && !/^https?:\/\//i.test(p));
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
            <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1.5">
              <input
                type="checkbox"
                checked={course.published}
                onChange={(e) => saveCourse({ published: e.target.checked })}
              />
              Published
            </label>
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
        <SlidesSection
          courseId={courseId}
          courseTitle={course.title}
          slides={slides}
          signedImages={signedImages}
          onChanged={reload}
          setErr={setErr}
        />
        <SrtSection courseId={courseId} cues={cues} onChanged={reload} setErr={setErr} />
        <QuizSection courseId={courseId} quiz={quiz} onChanged={reload} setErr={setErr} />
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
        <Field label="Voice">
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

/* ---------- Slides (deck-driven) ---------- */
function SlidesSection({
  courseId,
  courseTitle,
  slides,
  signedImages,
  onChanged,
  setErr,
}: {
  courseId: string;
  courseTitle: string;
  slides: Slide[];
  signedImages: Record<string, string>;
  onChanged: () => Promise<void>;
  setErr: (s: string | null) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const runNarrations = useServerFn(generateNarrations);

  async function handleDeck(file: File, replace: boolean) {
    setErr(null);
    setBusy("Parsing deck…");
    try {
      const parsed: ParsedSlide[] = await parseDeck(file);
      if (parsed.length === 0) throw new Error("No slides found in file.");

      // Optional AI narration for slides whose notes are empty
      let aiNarrations: string[] = parsed.map((p) => p.notes);
      if (autoNarrate) {
        setBusy("Generating narration with AI…");
        try {
          const res = await runNarrations({
            data: {
              courseTitle,
              slides: parsed.map((p) => ({ title: p.title, bullets: p.bullets })),
            },
          });
          aiNarrations = parsed.map((p, i) => (p.notes && p.notes.length > 8 ? p.notes : res.narrations[i] || ""));
        } catch (e) {
          console.warn("narration failed, continuing without AI", e);
        }
      }

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
        const ins = await supabase.from("slides").insert({
          course_id: courseId,
          idx: startIdx + i,
          title: p.title || `Slide ${startIdx + i + 1}`,
          body_md: body_md || null,
          image_url: imagePath,
          narration_text: aiNarrations[i] || null,
        });
        if (ins.error) throw ins.error;
        setProgress({ done: i + 1, total: parsed.length });
      }
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function updateSlide(id: string, patch: Partial<Slide>) {
    const { error } = await supabase.from("slides").update(patch).eq("id", id);
    if (error) setErr(error.message);
    await onChanged();
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

      {progress && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}

      {slides.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          No slides yet — upload a PDF or PPTX to get started.
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {slides.map((s) => {
            const url = s.image_url ? signedImages[s.image_url] || s.image_url : null;
            return (
              <li key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex gap-3">
                  <div className="flex w-12 flex-col items-center gap-1">
                    <span className="text-xs text-slate-500">#{s.idx + 1}</span>
                    <button
                      onClick={() => move(s, -1)}
                      disabled={s.idx === 0}
                      className="rounded border border-slate-700 px-1 text-xs disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(s, 1)}
                      disabled={s.idx === slides.length - 1}
                      className="rounded border border-slate-700 px-1 text-xs disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="w-32 shrink-0 overflow-hidden rounded-md bg-slate-800">
                    {url ? (
                      <img src={url} alt={s.title} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="flex h-20 items-center justify-center text-center text-[10px] text-slate-500">
                        text-only
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      defaultValue={s.title}
                      onBlur={(e) => e.target.value !== s.title && updateSlide(s.id, { title: e.target.value })}
                      placeholder="Slide title"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-medium"
                    />
                    <textarea
                      defaultValue={s.body_md ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (s.body_md ?? "") &&
                        updateSlide(s.id, { body_md: e.target.value || null })
                      }
                      placeholder="Bullets (markdown, one per line)"
                      rows={3}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300"
                    />
                    <textarea
                      defaultValue={s.narration_text ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (s.narration_text ?? "") &&
                        updateSlide(s.id, { narration_text: e.target.value || null })
                      }
                      placeholder="Narration (spoken aloud)"
                      rows={2}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-amber-200/80"
                    />
                  </div>
                  <button
                    onClick={() => deleteSlide(s)}
                    className="self-start rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
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
      const text = await file.text();
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : data.questions;
      if (!Array.isArray(arr)) throw new Error("Expected JSON array (or { questions: [...] }).");
      const rows = arr.map((q: Record<string, unknown>, i: number) => {
        const prompt = (q.prompt ?? q.question ?? q.q) as string;
        const opts = (q.options ?? [q.option_a, q.option_b, q.option_c, q.option_d]) as string[];
        const correctRaw = (q.correct ?? q.answer) as string | number;
        let correct = "A";
        if (typeof correctRaw === "number") correct = ["A", "B", "C", "D"][correctRaw] ?? "A";
        else if (typeof correctRaw === "string") {
          const t = correctRaw.trim().toUpperCase();
          correct = ["A", "B", "C", "D"].includes(t) ? t : "A";
        }
        if (!prompt) throw new Error(`Question ${i + 1} missing prompt.`);
        return {
          course_id: courseId,
          idx: i,
          prompt,
          option_a: opts?.[0] ?? null,
          option_b: opts?.[1] ?? null,
          option_c: opts?.[2] ?? null,
          option_d: opts?.[3] ?? null,
          correct,
          explanation: (q.explanation ?? null) as string | null,
          hint: (q.hint ?? null) as string | null,
          topic: (q.topic ?? null) as string | null,
          difficulty: (q.difficulty ?? null) as string | null,
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

  async function clearQuiz() {
    if (!confirm("Delete all quiz questions?")) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("course_id", courseId);
    if (error) setErr(error.message);
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Quiz ({quiz.length} questions)</h2>
        <div className="flex gap-2">
          {quiz.length > 0 && (
            <button
              onClick={clearQuiz}
              className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
            >
              Clear
            </button>
          )}
          <label className="cursor-pointer rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-400">
            {uploading ? "Importing…" : "Upload quiz JSON"}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>
      <details className="mt-2 text-xs text-slate-400">
        <summary className="cursor-pointer">Expected JSON format</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-[11px] text-slate-300">{`[
  {
    "prompt": "What is RAG?",
    "options": ["Retrieval-Augmented Generation", "Random Access Grid", "Rapid AI Gateway", "None"],
    "correct": "A",
    "explanation": "RAG combines retrieval with generation.",
    "topic": "AI",
    "difficulty": "easy"
  }
]`}</pre>
      </details>

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
