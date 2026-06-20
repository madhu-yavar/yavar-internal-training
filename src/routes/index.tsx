import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import yavarLogo from "@/assets/yavar-logo.png.asset.json";


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
          <div className="flex items-center gap-3">
            <img src={yavarLogo.url} alt="Yavar" className="h-8 w-auto" />
            <div className="hidden sm:block border-l border-white/10 pl-3">
              <div className="text-sm font-semibold leading-none">Learn</div>
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
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Ari tutor inside every course
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">
              Enterprise training,<br />
              <span className="bg-gradient-to-r from-amber-300 to-rose-300 bg-clip-text text-transparent">narrated by your AI tutor.</span>
            </h1>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        Copyright © 2026 Yavar techworks Pte Ltd. All rights reserved.
      </footer>

    </div>
  );
}
