import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthCtx } from "@/lib/auth-context";

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
};

export const Route = createFileRoute("/_authenticated/learn/")({
  component: LearnDashboard,
});

function LearnDashboard() {
  const { user, isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("courses")
      .select("id,title,description,cover_url")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCourses(data ?? []);
        setLoading(false);
      });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Yavar Training</div>
            <h1 className="text-lg font-semibold">Learning Library</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-400 sm:inline">{user?.email}</span>
            {isAdmin && (
              <Link to="/admin" className="rounded-md border border-amber-400/40 px-3 py-1.5 text-amber-300 hover:bg-amber-500/10">
                Admin
              </Link>
            )}
            <button onClick={signOut} className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="mb-4 text-xl font-semibold">Available courses</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Seeded built-in course (the existing training) */}
          <a href="/training" className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-amber-400/50 transition">
            <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-amber-500/30 to-violet-500/20 mb-4" />
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">Featured</div>
            <h3 className="mt-1 text-lg font-semibold group-hover:text-amber-300">Enterprise AI with Private LLM</h3>
            <p className="mt-2 text-sm text-slate-400">Technical & presales deep-dive on RAG, agentic AI, and deployment.</p>
          </a>

          {loading && <div className="text-sm text-slate-400">Loading…</div>}

          {courses.map((c) => (
            <Link
              key={c.id}
              to="/learn/$courseId"
              params={{ courseId: c.id }}
              className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-amber-400/50 transition"
            >
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-800 mb-4">
                {c.cover_url && <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />}
              </div>
              <h3 className="text-lg font-semibold group-hover:text-amber-300">{c.title}</h3>
              {c.description && <p className="mt-2 text-sm text-slate-400 line-clamp-3">{c.description}</p>}
            </Link>
          ))}

          {!loading && courses.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              No additional courses yet. {isAdmin && <Link to="/admin" className="text-amber-300 underline">Create one in Admin →</Link>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
