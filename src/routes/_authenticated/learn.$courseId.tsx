import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/learn/$courseId")({
  component: CoursePlayer,
});

function CoursePlayer() {
  const { courseId } = Route.useParams();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <h1 className="text-xl font-semibold">Course player</h1>
        <p className="mt-2 text-sm text-slate-400">
          Course <code className="text-amber-300">{courseId}</code> — full slide-and-narration player
          arrives in the next turn (Turn 3) along with progress tracking.
        </p>
        <Link to="/learn" className="mt-6 inline-block rounded-md border border-slate-700 px-4 py-2 hover:bg-slate-800">
          Back to library
        </Link>
      </div>
    </div>
  );
}
