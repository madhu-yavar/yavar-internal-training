import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthCtx } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
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
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Admin Panel</div>
            <h1 className="text-lg font-semibold">Training Administration</h1>
          </div>
          <Link to="/learn" className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
            ← Library
          </Link>
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
                <Link
                  key={c.id}
                  to="/admin/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-amber-400/50"
                >
                  <div className="flex items-center justify-between">
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
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
