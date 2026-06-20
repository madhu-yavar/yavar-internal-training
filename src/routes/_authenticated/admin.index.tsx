import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthCtx } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

type Course = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  voice: string;
  lang_code: string;
  updated_at: string;
};

function AdminHome() {
  const { isAdmin, user } = useAuthCtx();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) navigate({ to: "/learn" });
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("id,title,description,published,voice,lang_code,updated_at")
      .order("updated_at", { ascending: false });
    if (error) setErr(error.message);
    setCourses((data as Course[]) ?? []);
    setLoading(false);
  }

  async function createCourse() {
    if (!newTitle.trim()) return;
    setCreating(true);
    setErr(null);
    const { data, error } = await supabase
      .from("courses")
      .insert({
        title: newTitle.trim(),
        voice: "default",
        lang_code: "en",
        speed: 1.0,
        published: false,
        created_by: user?.id,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setNewTitle("");
    navigate({ to: "/admin/courses/$courseId", params: { courseId: data.id } });
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Redirecting…</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Yavar Learn · Admin</div>
            <h1 className="text-lg font-semibold">Course administration</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/requests" className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/20">
              💬 Requests
            </Link>
            <Link to="/learn" className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
              ← Library
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-base font-semibold">Create a new course</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Course title (e.g. Sales Onboarding 2026)"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
            <button
              onClick={createCourse}
              disabled={creating || !newTitle.trim()}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
          {err && <div className="mt-2 text-xs text-red-400">{err}</div>}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">All courses</h2>
          {loading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              No courses yet. Create your first one above.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <div key={c.id} className="relative rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-amber-400/50">
                  <Link
                    to="/admin/courses/$courseId"
                    params={{ courseId: c.id }}
                    className="block p-5"
                  >
                    <div className="flex items-center justify-between pr-24">
                      <h3 className="text-base font-semibold">{c.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                          c.published ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/50 text-slate-300"
                        }`}
                      >
                        {c.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    {c.description && <p className="mt-2 text-sm text-slate-400 line-clamp-2">{c.description}</p>}
                    <div className="mt-3 text-xs text-slate-500">
                      Voice: {c.voice} · {c.lang_code}
                    </div>
                  </Link>
                  <div className="absolute right-3 top-3 flex gap-1.5">
                    <Link
                      to="/admin/courses/$courseId"
                      params={{ courseId: c.id }}
                      title="Edit course"
                      className="rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!confirm(`Delete "${c.title}" and all its slides, narration, and quiz? This cannot be undone.`)) return;
                        const { error } = await supabase.from("courses").delete().eq("id", c.id);
                        if (error) { setErr(error.message); return; }
                        setCourses((cs) => cs.filter((x) => x.id !== c.id));
                      }}
                      title="Delete course"
                      className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[11px] text-rose-100 hover:bg-rose-500/30"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
