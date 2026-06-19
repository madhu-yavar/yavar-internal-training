import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your App" },
      { name: "description", content: "Replace this with a one-sentence description of your app." },
      { property: "og:title", content: "Your App" },
      { property: "og:description", content: "Replace this with a one-sentence description of your app." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-8">
      <div className="max-w-xl text-center space-y-6">
        <div className="text-xs uppercase tracking-[0.25em] text-amber-400">Yavar Training</div>
        <h1 className="text-4xl font-semibold leading-tight">Enterprise AI with Private LLM – Technical & Presales Deep Dive</h1>
        <p className="text-slate-300">Interactive self-learning module with narration, animated slide flow, chapter navigation, and a downloadable MP4.</p>
        <a href="/training" className="inline-block rounded-md bg-amber-500 px-6 py-3 font-semibold text-slate-900 hover:bg-amber-400 transition">Start Training →</a>
      </div>
    </div>
  );
}
