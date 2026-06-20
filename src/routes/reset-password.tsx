import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Yavar Training" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Supabase places the recovery session in the URL hash and signs the user in.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: { must_change_password: false },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg("Password updated. Redirecting…");
    setTimeout(() => navigate({ to: "/learn" }), 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <div className="text-xs uppercase tracking-[0.25em] text-amber-400 mb-2">Yavar Training</div>
        <h1 className="text-2xl font-semibold mb-1">Set a new password</h1>
        <p className="text-sm text-slate-400 mb-6">
          {ready ? "Enter and confirm your new password." : "Validating reset link…"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="password" required disabled={!ready || loading} value={pw}
            onChange={(e) => setPw(e.target.value)} placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none disabled:opacity-50"
          />
          <input
            type="password" required disabled={!ready || loading} value={pw2}
            onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none disabled:opacity-50"
          />
          <button
            disabled={!ready || loading}
            className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm text-emerald-400">{msg}</p>}
        {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}
      </div>
    </div>
  );
}
