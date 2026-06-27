import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/external";
import { BrandFooter } from "@/components/BrandFooter";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Yavar Training" },
      { name: "description", content: "Sign in to access your training courses." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

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

  const PUBLIC_EMAIL_DOMAINS = new Set([
    "gmail.com","googlemail.com","yahoo.com","yahoo.co.in","yahoo.co.uk","ymail.com","rocketmail.com",
    "outlook.com","hotmail.com","hotmail.co.uk","live.com","msn.com",
    "icloud.com","me.com","mac.com",
    "aol.com","protonmail.com","proton.me","pm.me",
    "mail.com","gmx.com","gmx.net","zoho.com",
    "rediffmail.com","yandex.com","yandex.ru","qq.com","163.com","126.com","sina.com",
  ]);

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    const cleaned = email.trim().toLowerCase();
    const domain = cleaned.split("@")[1] ?? "";
    if (!domain || PUBLIC_EMAIL_DOMAINS.has(domain)) {
      setErr("Please sign up with your official work email. Public email providers (gmail, yahoo, outlook, etc.) are not allowed.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: cleaned,
      password,
      options: { emailRedirectTo: `${window.location.origin}/learn` },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg("Account created. You can sign in now.");
    setMode("signin");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <Link to="/" className="mb-5 flex items-center gap-2">
          <img src="/yavar-logo.png" alt="Yavar" className="h-7 w-auto" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400">Yavar Learn</span>
        </Link>
        <h1 className="text-2xl font-semibold mb-1">
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}

        </h1>
        <p className="text-sm text-slate-400 mb-6">
          {mode === "signin"
            ? "Use your email and password."
            : mode === "signup"
            ? "Use your official work email (public providers like gmail/yahoo are not allowed). Password must be 8+ characters."
            : "We'll send a password reset link to your email."}
        </p>

        {mode === "signin" && (
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
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => { setMode("signup"); setErr(null); setMsg(null); }} className="text-slate-400 hover:text-amber-300">
                Create account
              </button>
              <button type="button" onClick={() => { setMode("forgot"); setErr(null); setMsg(null); }} className="text-slate-400 hover:text-amber-300">
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={signUp} className="space-y-4">
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
            />
            <input
              type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ characters)"
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
            />
            <button
              disabled={loading}
              className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
            <button
              type="button" onClick={() => { setMode("signin"); setErr(null); setMsg(null); }}
              className="w-full text-sm text-slate-400 hover:text-amber-300"
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === "forgot" && (
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
      <BrandFooter />
    </div>
  );
}
