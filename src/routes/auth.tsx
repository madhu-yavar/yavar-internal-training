import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Yavar Training" },
      { name: "description", content: "Sign in with a one-time code sent to your email." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/learn" });
    });
  }, [navigate]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg("We sent a 6-digit code to your email.");
    setStage("code");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    navigate({ to: "/learn" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
        <div className="text-xs uppercase tracking-[0.25em] text-amber-400 mb-2">Yavar Training</div>
        <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-slate-400 mb-6">
          {stage === "email" ? "Enter your email — we'll send a one-time code." : `Enter the code sent to ${email}.`}
        </p>

        {stage === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
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
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <input
              inputMode="numeric" pattern="[0-9]*" required value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-center tracking-[0.5em] text-slate-100 focus:border-amber-400 focus:outline-none"
            />
            <button
              disabled={loading}
              className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button" onClick={() => { setStage("email"); setCode(""); setMsg(null); }}
              className="w-full text-sm text-slate-400 hover:text-slate-200"
            >
              Use a different email
            </button>
          </form>
        )}

        {msg && <p className="mt-4 text-sm text-emerald-400">{msg}</p>}
        {err && <p className="mt-4 text-sm text-rose-400">{err}</p>}
      </div>
    </div>
  );
}
