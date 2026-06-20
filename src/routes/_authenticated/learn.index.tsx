import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthCtx } from "@/lib/auth-context";
import { MessageAdminDialog } from "@/components/MessageAdminDialog";

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
};

type Stat = {
  totalSlides: number;
  viewedSlides: number;
  attempts: number;
  bestScore: number | null;
  bestTotal: number | null;
};

type Request = {
  id: string;
  subject: string;
  type: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/learn/")({
  component: LearnDashboard,
});

function LearnDashboard() {
  const { user, isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgOpen, setMsgOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: cs } = await supabase
        .from("courses")
        .select("id,title,description,cover_url")
        .eq("published", true)
        .order("created_at", { ascending: false });
      const courseList = (cs as Course[]) ?? [];
      setCourses(courseList);

      const ids = courseList.map((c) => c.id);
      if (ids.length) {
        const [{ data: slides }, { data: views }, { data: attempts }] = await Promise.all([
          supabase.from("slides").select("course_id").in("course_id", ids),
          supabase.from("slide_views").select("course_id,slide_idx").eq("user_id", user.id).in("course_id", ids),
          supabase.from("quiz_attempts").select("course_id,score,total").eq("user_id", user.id).in("course_id", ids),
        ]);
        const map: Record<string, Stat> = {};
        for (const id of ids) map[id] = { totalSlides: 0, viewedSlides: 0, attempts: 0, bestScore: null, bestTotal: null };
        ((slides ?? []) as Array<{ course_id: string }>).forEach((s) => { map[s.course_id].totalSlides++; });
        const viewedSets: Record<string, Set<number>> = {};
        ((views ?? []) as Array<{ course_id: string; slide_idx: number }>).forEach((v) => {
          (viewedSets[v.course_id] ||= new Set()).add(v.slide_idx);
        });
        for (const id of ids) map[id].viewedSlides = viewedSets[id]?.size ?? 0;
        ((attempts ?? []) as Array<{ course_id: string; score: number; total: number }>).forEach((a) => {
          const m = map[a.course_id];
          m.attempts++;
          const ratio = a.score / Math.max(1, a.total);
          const bestRatio = m.bestScore != null ? m.bestScore / Math.max(1, m.bestTotal!) : -1;
          if (ratio > bestRatio) { m.bestScore = a.score; m.bestTotal = a.total; }
        });
        setStats(map);
      }

      const { data: reqs } = await supabase
        .from("course_requests")
        .select("id,subject,type,status,admin_reply,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRequests((reqs as Request[]) ?? []);

      setLoading(false);
    })();
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  function statusFor(s: Stat | undefined): { label: string; pct: number; tone: string } {
    if (!s || s.totalSlides === 0) return { label: "Not started", pct: 0, tone: "bg-slate-700/50 text-slate-300" };
    const pct = Math.round((s.viewedSlides / s.totalSlides) * 100);
    if (s.viewedSlides >= s.totalSlides && s.bestScore != null && (s.bestScore / s.bestTotal!) >= 0.7) {
      return { label: "Completed", pct: 100, tone: "bg-emerald-500/15 text-emerald-300" };
    }
    if (s.viewedSlides === 0) return { label: "Not started", pct: 0, tone: "bg-slate-700/50 text-slate-300" };
    return { label: `In progress · ${pct}%`, pct, tone: "bg-amber-500/15 text-amber-300" };
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-rose-400 text-sm font-bold text-slate-900">A</div>
            <div>
              <div className="text-sm font-semibold leading-none">Yavar Learn</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">with Ari</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-400 sm:inline">{user?.email}</span>
            <button onClick={() => setMsgOpen(true)} className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-amber-200 hover:bg-amber-500/20">
              💬 Message team
            </button>
            {isAdmin && (
              <Link to="/admin" className="rounded-md border border-amber-400/40 px-3 py-1.5 text-amber-300 hover:bg-amber-500/10">Admin</Link>
            )}
            <button onClick={signOut} className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="mb-4 text-xl font-semibold">Your courses</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading && <div className="text-sm text-slate-400">Loading…</div>}

          {courses.map((c) => {
            const s = stats[c.id];
            const st = statusFor(s);
            return (
              <Link
                key={c.id}
                to="/learn/$courseId"
                params={{ courseId: c.id }}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-amber-400/50 transition"
              >
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-800 mb-4">
                  {c.cover_url && <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold group-hover:text-amber-300">{c.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.tone}`}>{st.label}</span>
                </div>
                {c.description && <p className="mt-2 text-sm text-slate-400 line-clamp-2">{c.description}</p>}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${st.pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{s ? `${s.viewedSlides}/${s.totalSlides} slides` : "—"}</span>
                  <span>
                    {s && s.attempts > 0
                      ? `Best ${s.bestScore}/${s.bestTotal} · ${s.attempts} attempt${s.attempts > 1 ? "s" : ""}`
                      : "Quiz not taken"}
                  </span>
                </div>
              </Link>
            );
          })}

          {!loading && courses.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              No courses yet. {isAdmin && <Link to="/admin" className="text-amber-300 underline">Create one in Admin →</Link>}
            </div>
          )}
        </div>

        {requests.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-base font-semibold">My recent requests</h2>
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400">{r.type.replace("_", " ")}</div>
                      <div className="truncate text-sm font-semibold text-slate-100">{r.subject}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                      r.status === "responded" ? "bg-emerald-500/15 text-emerald-200"
                        : r.status === "closed" ? "bg-slate-700/50 text-slate-300"
                          : "bg-amber-500/15 text-amber-200"
                    }`}>{r.status}</span>
                  </div>
                  {r.admin_reply && (
                    <div className="mt-2 rounded-md border border-emerald-400/20 bg-emerald-500/5 p-2 text-xs text-emerald-100">
                      <span className="font-semibold">Ari team: </span>{r.admin_reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {user?.id && (
        <MessageAdminDialog open={msgOpen} onClose={() => setMsgOpen(false)} userId={user.id} />
      )}
    </div>
  );
}
