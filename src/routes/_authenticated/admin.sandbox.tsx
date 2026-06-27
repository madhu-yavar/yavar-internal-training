import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuthCtx } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/external';
import { BrandFooter } from '@/components/BrandFooter';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { SandboxExercise } from '~/lib/sandbox.types';

export const Route = createFileRoute('/_authenticated/admin/sandbox')({
  component: AdminSandbox,
});

function AdminSandbox() {
  const { isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<SandboxExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate({ to: '/learn' });
      return;
    }
    loadExercises();
  }, [isAdmin, navigate]);

  async function loadExercises() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sandbox_exercises')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading exercises:', error);
    } else {
      setExercises(data ?? []);
    }
    setLoading(false);
  }

  async function togglePublished(exercise: SandboxExercise) {
    setTogglingId(exercise.id);
    const { error } = await supabase
      .from('sandbox_exercises')
      .update({ is_published: !exercise.is_published })
      .eq('id', exercise.id);

    if (!error) {
      setExercises(exercises.map((e) => (e.id === exercise.id ? { ...e, is_published: !e.is_published } : e)));
    }
    setTogglingId(null);
  }

  async function deleteExercise(id: string) {
    if (!confirm('Are you sure you want to delete this exercise? This cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    const { error } = await supabase.from('sandbox_exercises').delete().eq('id', id);

    if (!error) {
      setExercises(exercises.filter((e) => e.id !== id));
    }
    setDeletingId(null);
  }

  const stats = {
    total: exercises.length,
    published: exercises.filter((e) => e.is_published).length,
    easy: exercises.filter((e) => e.difficulty === 'easy').length,
    medium: exercises.filter((e) => e.difficulty === 'medium').length,
    hard: exercises.filter((e) => e.difficulty === 'hard').length,
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-slate-400 hover:text-slate-200">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Yavar Learn · Admin</div>
              <h1 className="text-lg font-semibold">Sandbox Exercises</h1>
            </div>
          </div>
          <Button
            onClick={() => navigate({ to: '/admin/sandbox/new' })}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Exercise
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-2xl font-bold text-slate-200">{stats.total}</div>
            <div className="text-xs text-slate-500">Total</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.published}</div>
            <div className="text-xs text-slate-500">Published</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.easy}</div>
            <div className="text-xs text-slate-500">Easy</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-2xl font-bold text-amber-400">{stats.medium}</div>
            <div className="text-xs text-slate-500">Medium</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-2xl font-bold text-rose-400">{stats.hard}</div>
            <div className="text-xs text-slate-500">Hard</div>
          </div>
        </div>

        {/* Exercise List */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading exercises...
          </div>
        ) : exercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-400">
            <p className="mb-4">No exercises yet. Create your first Python coding challenge!</p>
            <Button
              onClick={() => navigate({ to: '/admin/sandbox/new' })}
              variant="outline"
              className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Exercise
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-200">{exercise.title}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        exercise.difficulty === 'easy'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : exercise.difficulty === 'medium'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        {exercise.difficulty}
                      </span>
                      {exercise.is_published ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-400 line-clamp-1">{exercise.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      {exercise.topic && <span>Topic: {exercise.topic}</span>}
                      <span>{exercise.estimated_minutes} min</span>
                      <span>{exercise.test_cases?.length ?? 0} test cases</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link
                      to="/sandbox/$exerciseId"
                      params={{ exerciseId: exercise.id }}
                      className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => togglePublished(exercise)}
                      disabled={togglingId === exercise.id}
                      className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                      title={exercise.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {exercise.is_published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => navigate({ to: '/admin/sandbox/$exerciseId', params: { exerciseId: exercise.id } })}
                      className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteExercise(exercise.id)}
                      disabled={deletingId === exercise.id}
                      className="p-2 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === exercise.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BrandFooter />
    </div>
  );
}
