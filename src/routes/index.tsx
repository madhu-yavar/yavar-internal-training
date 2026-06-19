import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yavar Training — Enterprise AI Learning" },
      { name: "description", content: "Self-paced training on Enterprise AI, Private LLMs, RAG, and agentic systems." },
      { property: "og:title", content: "Yavar Training" },
      { property: "og:description", content: "Self-paced training on Enterprise AI, Private LLMs, RAG, and agentic systems." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/learn" });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-8">
      <div className="max-w-xl text-center space-y-6">
        <div className="text-xs uppercase tracking-[0.25em] text-amber-400">Yavar Training</div>
        <h1 className="text-4xl font-semibold leading-tight">
          Enterprise AI training, narrated and on-demand
        </h1>
        <p className="text-slate-300">
          Sign in to access your learning library — Private LLMs, RAG, agentic AI, and more.
          New courses are added by admins.
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/auth" className="rounded-md bg-amber-500 px-6 py-3 font-semibold text-slate-900 hover:bg-amber-400 transition">
            Sign in →
          </Link>
          <a href="/training" className="rounded-md border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:bg-slate-900 transition">
            Preview demo
          </a>
        </div>
      </div>
    </div>
  );
}
