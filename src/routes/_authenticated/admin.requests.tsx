import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/external";
import { useAuthCtx } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  component: AdminRequests,
});

type Req = {
  id: string;
  user_id: string;
  course_id: string | null;
  type: string;
  subject: string;
  body: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

function AdminRequests() {
  const { isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const [list, setList] = useState<Req[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "responded" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<string, string>>({});

  useEffect(() => { if (!isAdmin) navigate({ to: "/learn" }); }, [isAdmin, navigate]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, filter]);

  async function load() {
    setLoading(true);
    let q = supabase.from("course_requests").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setList((data as Req[]) ?? []);
    setLoading(false);
  }

  async function reply(r: Req, status: "responded" | "closed") {
    const text = replies[r.id] ?? r.admin_reply ?? "";
    const { error } = await supabase
      .from("course_requests")
      .update({ admin_reply: text || r.admin_reply, status })
      .eq("id", r.id);
    if (!error) void load();
  }

  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Redirecting…</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Admin · Requests</div>
            <h1 className="text-lg font-semibold">Learner messages</h1>
          </div>
          <Link to="/admin" className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">← Admin</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex gap-2 text-xs">
          {(["open", "responded", "closed", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-md border px-3 py-1.5 ${filter === f ? "border-amber-400/50 bg-amber-500/15 text-amber-200" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? <div className="text-sm text-slate-400">Loading…</div>
          : list.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No requests.</div>
            : (
              <div className="space-y-3">
                {list.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400">{r.type.replace("_", " ")}</div>
                        <h3 className="text-base font-semibold">{r.subject}</h3>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                        r.status === "responded" ? "bg-emerald-500/15 text-emerald-200"
                          : r.status === "closed" ? "bg-slate-700/50 text-slate-300"
                            : "bg-amber-500/15 text-amber-200"
                      }`}>{r.status}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      From user {r.user_id.slice(0, 8)}… · {new Date(r.created_at).toLocaleString()}
                      {r.course_id && <> · course {r.course_id.slice(0, 8)}…</>}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap rounded-md border border-white/5 bg-slate-950/50 p-3 text-sm text-slate-200">{r.body}</p>

                    <div className="mt-3">
                      <textarea
                        defaultValue={r.admin_reply ?? ""}
                        onChange={(e) => setReplies((p) => ({ ...p, [r.id]: e.target.value }))}
                        placeholder="Reply to learner…"
                        rows={3}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button onClick={() => reply(r, "closed")} className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10">Close</button>
                        <button onClick={() => reply(r, "responded")} className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-400">Send reply</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </main>
    </div>
  );
}
