import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuthCtx } from "@/lib/auth-context";
import { getAdminDashboard, type DashboardData } from "@/lib/adminStats.functions";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function AdminDashboard() {
  const { isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getAdminDashboard);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) navigate({ to: "/learn" });
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      try {
        const d = await fetchDashboard();
        setData(d);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, fetchDashboard]);

  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Redirecting…</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Yavar Learn · Admin</div>
            <h1 className="text-lg font-semibold">Learner progress dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
              ← Courses
            </Link>
            <Link to="/learn" className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
              Library
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {err && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}
        {loading && <div className="text-sm text-slate-400">Loading…</div>}

        {data && (
          <>
            {/* KPI row */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <KPI label="Learners" value={data.totals.learners} accent="amber" />
              <KPI label="Courses" value={data.totals.courses} accent="sky" />
              <KPI label="Published" value={data.totals.published} accent="emerald" />
              <KPI label="Completions" value={data.totals.completions} accent="violet" />
              <KPI label="Quiz attempts" value={data.totals.attempts} accent="fuchsia" />
            </section>

            {/* Course directory */}
            <section>
              <h2 className="mb-3 text-base font-semibold">Course directory</h2>
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Course</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Enrolled</th>
                      <th className="px-4 py-2 text-right">Completed</th>
                      <th className="px-4 py-2 text-right">Attempts</th>
                      <th className="px-4 py-2 text-right">Avg score</th>
                      <th className="px-4 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.courses.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No courses yet.</td></tr>
                    ) : data.courses.map((c) => (
                      <tr key={c.course_id} className="border-t border-slate-800 hover:bg-slate-900/40">
                        <td className="px-4 py-2 font-medium text-slate-100">{c.title}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${c.published ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/50 text-slate-300"}`}>
                            {c.published ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-200">{c.enrolled}</td>
                        <td className="px-4 py-2 text-right text-slate-200">{c.completed}</td>
                        <td className="px-4 py-2 text-right text-slate-200">{c.attempts}</td>
                        <td className="px-4 py-2 text-right">
                          {c.avg_score == null ? <span className="text-slate-500">—</span> : (
                            <span className={c.avg_score >= 70 ? "text-emerald-300" : c.avg_score >= 50 ? "text-amber-300" : "text-rose-300"}>
                              {c.avg_score}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link to="/admin/courses/$courseId" params={{ courseId: c.course_id }} className="text-xs text-amber-300 hover:text-amber-200">Edit →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Learners */}
            <section>
              <h2 className="mb-3 text-base font-semibold">Learners</h2>
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Learner</th>
                      <th className="px-4 py-2 text-left">Joined</th>
                      <th className="px-4 py-2 text-right">Enrolled</th>
                      <th className="px-4 py-2 text-right">Completed</th>
                      <th className="px-4 py-2 text-right">Attempts</th>
                      <th className="px-4 py-2 text-right">Best score</th>
                      <th className="px-4 py-2 text-left">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.learners.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No learners yet.</td></tr>
                    ) : data.learners.map((l) => (
                      <tr key={l.user_id} className="border-t border-slate-800 hover:bg-slate-900/40">
                        <td className="px-4 py-2 text-slate-100">
                          {l.email ?? <span className="font-mono text-xs text-slate-400">{l.user_id.slice(0, 8)}…</span>}
                        </td>
                        <td className="px-4 py-2 text-slate-400">{fmtDate(l.created_at)}</td>
                        <td className="px-4 py-2 text-right text-slate-200">{l.enrollments}</td>
                        <td className="px-4 py-2 text-right text-slate-200">{l.completed}</td>
                        <td className="px-4 py-2 text-right text-slate-200">{l.attempts}</td>
                        <td className="px-4 py-2 text-right">
                          {l.best_score == null ? <span className="text-slate-500">—</span> : (
                            <span className={l.best_score >= 70 ? "text-emerald-300" : l.best_score >= 50 ? "text-amber-300" : "text-rose-300"}>
                              {l.best_score}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-400">{fmtDate(l.last_active)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent attempts */}
            <section>
              <h2 className="mb-3 text-base font-semibold">Recent quiz attempts</h2>
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">When</th>
                      <th className="px-4 py-2 text-left">Learner</th>
                      <th className="px-4 py-2 text-left">Course</th>
                      <th className="px-4 py-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No attempts yet.</td></tr>
                    ) : data.recent.map((r, i) => {
                      const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
                      return (
                        <tr key={i} className="border-t border-slate-800 hover:bg-slate-900/40">
                          <td className="px-4 py-2 text-slate-400">{fmtDate(r.taken_at)}</td>
                          <td className="px-4 py-2 text-slate-100">{r.email ?? <span className="font-mono text-xs text-slate-400">{r.user_id.slice(0, 8)}…</span>}</td>
                          <td className="px-4 py-2 text-slate-200">{r.course_title}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={pct >= 70 ? "text-emerald-300" : pct >= 50 ? "text-amber-300" : "text-rose-300"}>
                              {r.score}/{r.total} · {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  amber: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  sky: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  violet: "border-violet-400/40 bg-violet-500/10 text-violet-200",
  fuchsia: "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200",
};

function KPI({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${ACCENTS[accent] ?? ACCENTS.amber}`}>
      <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
