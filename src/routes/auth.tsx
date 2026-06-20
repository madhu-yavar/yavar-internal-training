import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Yavar Training" },
      { name: "description", content: "Sign in to access your training courses." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/learn" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (data.user?.user_metadata?.must_change_password) {
      navigate({ to: "/change-password" });
    } else {
      navigate({ to: "/learn" });
    }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg("If that email exists, a password reset link has been sent.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <div className="text-xs uppercase tracking-[0.25em] text-amber-400 mb-2">Yavar Training</div>
        <h1 className="text-2xl font-semibold mb-1">
          {mode === "signin" ? "Sign in" : "Reset password"}
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {mode === "signin"
            ? "Use your email and password."
            : "We'll send a password reset link to your email."}
        </p>

        {mode === "signin" ? (
          <form onSubmit={signIn} className="space-y-4">
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
            />
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
            />
            <button
              disabled={loading}
              className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button" onClick={() => { setMode("forgot"); setErr(null); setMsg(null); }}
              className="w-full text-sm text-slate-400 hover:text-amber-300"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={sendReset} className="space-y-4">
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
            />
            <button
              disabled={loading}
              className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button" onClick={() => { setMode("signin"); setErr(null); setMsg(null); }}
              className="w-full text-sm text-slate-400 hover:text-amber-300"
            >
              Back to sign in
            </button>
          </form>
        )}

        {msg && <p className="mt-4 text-sm text-emerald-400">{msg}</p>}
        {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-300">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
