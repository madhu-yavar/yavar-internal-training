import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yavar Learn with Ari — AI-narrated training" },
      { name: "description", content: "Self-paced enterprise training narrated by Ari, your AI tutor. PPT-to-course in minutes, adaptive quizzes, live tutor chat." },
      { property: "og:title", content: "Yavar Learn with Ari" },
      { property: "og:description", content: "AI-narrated training courses with Ari, your built-in tutor. Adaptive quizzes, progress tracking, and on-demand learning." },
    ],
  }),
  component: Index,
});

function Index() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (mounted) setSignedIn(!!data.user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setSignedIn(!!session?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-rose-400 text-sm font-bold text-slate-900">A</div>
            <div>
              <div className="text-sm font-semibold leading-none">Yavar Learn</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">with Ari</div>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            {signedIn ? (
              <Link to="/learn" className="rounded-md bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400">Open library →</Link>
            ) : (
              <Link to="/auth" className="rounded-md bg-amber-500 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-400">Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.18),transparent_55%),radial-gradient(circle_at_85%_30%,rgba(244,63,94,0.15),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Ari tutor inside every course
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">
              Enterprise training,<br />
              <span className="bg-gradient-to-r from-amber-300 to-rose-300 bg-clip-text text-transparent">narrated by your AI tutor.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Yavar Learn turns a PPT, a script, and a quiz bank into a self-paced course in minutes.
              Your learners watch, listen, ask <span className="font-semibold text-amber-200">Ari</span> anything, and prove their skills with adaptive quizzes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <Link to="/learn" className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-900 hover:bg-amber-400">Go to library →</Link>
              ) : (
                <Link to="/auth" className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-900 hover:bg-amber-400">Sign in to start</Link>
              )}
              <a href="/training" className="rounded-lg border border-white/15 px-6 py-3 font-semibold text-slate-200 hover:bg-white/5">Preview the demo course</a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 bg-slate-900/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3 sm:px-6">
          <Feature
            icon="🎙"
            title="AI-narrated slides"
            body="Upload a PDF/PPT + SRT script. We auto-bind voice-over with slide timing — no editing required."
          />
          <Feature
            icon="🤖"
            title="Ari, your built-in tutor"
            body="Every course ships with Ari — a context-aware chat tutor that answers learners' questions in real time."
          />
          <Feature
            icon="🎓"
            title="Adaptive quizzes"
            body="20 random questions per attempt, hints, explanations, and full attempt history. Retake any time."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        Yavar Learn · Powered by Ari · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
