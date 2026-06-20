import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthCtx } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminHome,
});

function AdminHome() {
  const { isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAdmin) navigate({ to: "/learn" });
  }, [isAdmin, navigate]);
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Redirecting…
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Admin Panel</div>
            <h1 className="text-lg font-semibold">Training Administration</h1>
          </div>
          <Link to="/learn" className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
            ← Library
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        <Card title="Courses" desc="Create courses, upload slide images, SRT captions, and quiz files." cta="Coming in Turn 2" />
        <Card title="Voice models" desc="Configure Yavar TTS endpoint, voice, and language per course." cta="Coming in Turn 2" />
        <Card title="Analytics" desc="See who took which course, completion rate, average quiz score, and per-user progress." cta="Coming in Turn 3" />
        <Card title="Users & roles" desc="Promote teammates to admin or remove access." cta="Coming in Turn 2" />
      </main>
    </div>
  );
}

function Card({ title, desc, cta }: { title: string; desc: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{desc}</p>
      <div className="mt-4 inline-block rounded-md border border-amber-400/30 px-3 py-1 text-xs text-amber-300">{cta}</div>
    </div>
  );
}
