import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/external";
import { BrandFooter } from "@/components/BrandFooter";



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
            <img src="/yavar-logo.png" alt="Yavar" className="h-8 w-auto" />
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
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" /> Ari tutor inside every course
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">
              Learn anything,<br />
              <span className="bg-gradient-to-r from-amber-300 to-rose-300 bg-clip-text text-transparent">at your own pace.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
              Friendly, bite-sized enterprise training narrated by Ari — your personal AI tutor.
              Watch, ask, retry. We meet you where you are.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {signedIn ? (
                <Link to="/learn" className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400">Go to library →</Link>
              ) : (
                <Link to="/auth" className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400">Get started — it's free</Link>
              )}
            </div>
          </div>

          {/* Khan-Academy-style friendly learning illustration */}
          <div className="relative mx-auto w-full max-w-md">
            <LearningScene />
          </div>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}

function LearningScene() {
  return (
    <div className="relative aspect-square w-full">
      {/* soft glow */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-amber-400/10 via-rose-400/10 to-sky-400/10 blur-2xl" />

      <svg viewBox="0 0 400 400" className="relative h-full w-full" role="img" aria-label="Friendly tutor teaching on a chalkboard">
        <defs>
          <linearGradient id="board" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f4a3a" />
            <stop offset="100%" stopColor="#0a2f25" />
          </linearGradient>
          <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fcd9b8" />
            <stop offset="100%" stopColor="#f0b88a" />
          </linearGradient>
        </defs>

        {/* chalkboard */}
        <g>
          <rect x="40" y="50" width="320" height="200" rx="14" fill="url(#board)" stroke="#b88a3e" strokeWidth="6" />
          {/* chalk equations - draw animation */}
          <g stroke="#fef3c7" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M70 100 L130 100" className="chalk chalk-1" />
            <path d="M70 130 L180 130" className="chalk chalk-2" />
            <path d="M70 160 L150 160" className="chalk chalk-3" />
            <circle cx="240" cy="135" r="28" className="chalk chalk-4" />
            <path d="M212 135 L268 135 M240 107 L240 163" className="chalk chalk-5" />
            <path d="M290 95 L330 95 M290 115 L320 115 M290 135 L325 135" className="chalk chalk-6" />
          </g>
          {/* sparkle */}
          <g className="sparkle">
            <path d="M320 70 L324 78 L332 82 L324 86 L320 94 L316 86 L308 82 L316 78 Z" fill="#fde68a" />
          </g>
        </g>

        {/* tutor character */}
        <g className="tutor-bob">
          {/* body */}
          <path d="M170 360 Q170 290 200 290 Q230 290 230 360 Z" fill="#f59e0b" />
          {/* head */}
          <circle cx="200" cy="270" r="26" fill="url(#skin)" />
          {/* hair */}
          <path d="M176 262 Q180 240 200 240 Q220 240 224 262 Q214 254 200 254 Q186 254 176 262 Z" fill="#3f2a1d" />
          {/* eyes */}
          <circle cx="192" cy="270" r="2.5" fill="#1f2937" />
          <circle cx="208" cy="270" r="2.5" fill="#1f2937" />
          {/* smile */}
          <path d="M192 280 Q200 286 208 280" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* arm pointing at board */}
          <path d="M178 308 Q150 280 138 250" stroke="#f59e0b" strokeWidth="12" fill="none" strokeLinecap="round" className="tutor-arm" />
          {/* pointer stick */}
          <line x1="138" y1="250" x2="118" y2="222" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" className="tutor-arm" />
        </g>

        {/* floating learning icons */}
        <g className="float-a">
          <rect x="40" y="290" width="44" height="34" rx="6" fill="#0ea5e9" />
          <path d="M50 308 L62 308 M50 314 L74 314" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="float-b">
          <circle cx="340" cy="300" r="20" fill="#ef4444" />
          <path d="M332 300 L338 306 L348 294" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="float-c">
          <path d="M340 360 l8 -16 l8 16 l-8 -4 z" fill="#a78bfa" />
        </g>
      </svg>

      <style>{`
        @keyframes chalk-draw { from { stroke-dasharray: 0 400; } to { stroke-dasharray: 400 0; } }
        .chalk { stroke-dasharray: 0 400; animation: chalk-draw 1.2s ease-out forwards; }
        .chalk-1 { animation-delay: .1s; } .chalk-2 { animation-delay: .35s; } .chalk-3 { animation-delay: .6s; }
        .chalk-4 { animation-delay: .9s; } .chalk-5 { animation-delay: 1.2s; } .chalk-6 { animation-delay: 1.45s; }
        @keyframes sparkle { 0%,100% { opacity: .3; transform: scale(.9); transform-origin: 320px 82px; } 50% { opacity: 1; transform: scale(1.15); } }
        .sparkle { animation: sparkle 2.4s ease-in-out infinite; }
        @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .tutor-bob { animation: bob 3.2s ease-in-out infinite; transform-origin: 200px 320px; }
        @keyframes point { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-4deg); } }
        .tutor-arm { transform-origin: 178px 308px; animation: point 2.4s ease-in-out infinite; }
        @keyframes floatA { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes floatB { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes floatC { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-8px) rotate(8deg); } }
        .float-a { animation: floatA 3.6s ease-in-out infinite; }
        .float-b { animation: floatB 4s ease-in-out infinite .4s; }
        .float-c { animation: floatC 3.2s ease-in-out infinite .8s; }
      `}</style>
    </div>
  );
}
