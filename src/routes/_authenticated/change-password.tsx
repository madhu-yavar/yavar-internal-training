import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/external";
import { useAuthCtx } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({ meta: [{ title: "Change password — Yavar Training" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { user } = useAuthCtx();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const forced = !!user.user_metadata?.must_change_password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: { must_change_password: false },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    navigate({ to: "/learn" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <div className="text-xs uppercase tracking-[0.25em] text-amber-400 mb-2">Yavar Training</div>
        <h1 className="text-2xl font-semibold mb-1">
          {forced ? "Set your password" : "Change password"}
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {forced
            ? "You're signed in with a temporary password. Please set a new one to continue."
            : `Update the password for ${user.email}.`}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="password" required value={pw}
            onChange={(e) => setPw(e.target.value)} placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
          />
          <input
            type="password" required value={pw2}
            onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
          />
          <button
            disabled={loading}
            className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}
      </div>
    </div>
  );
}
