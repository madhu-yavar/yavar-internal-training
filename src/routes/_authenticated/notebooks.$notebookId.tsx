import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/external';
import { useAuthCtx } from '@/lib/auth-context';
import { JupyterNotebook } from '@/components/JupyterNotebook';
import { BrandFooter } from '@/components/BrandFooter';
import { ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react';
import type { NotebookFormat, NotebookExercise } from '@/lib/notebook.types';

export const Route = createFileRoute('/_authenticated/notebooks/$notebookId')({
  component: NotebookEditor,
});

function NotebookEditor() {
  const { notebookId } = Route.useParams();
  const { user } = useAuthCtx();
  const [exercise, setExercise] = useState<NotebookExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [attempts, setAttempts] = useState<any[]>([]);

  // Fetch notebook exercise data
  useEffect(() => {
    if (!user?.id || !notebookId) return;

    (async () => {
      setLoading(true);

      // Fetch exercise
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('notebook_exercises')
        .select('*')
        .eq('id', notebookId)
        .single();

      if (exerciseError || !exerciseData) {
        console.error('Error fetching notebook exercise:', exerciseError);
        setLoading(false);
        return;
      }

      setExercise(exerciseData as NotebookExercise);

      // Fetch attempts
      const { data: attemptsData } = await supabase
        .from('notebook_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', notebookId)
        .order('attempted_at', { ascending: false })
        .limit(3);

      setAttempts(attemptsData ?? []);

      setLoading(false);
    })();
  }, [user?.id, notebookId]);

  // Handle save
  const handleSave = async (notebook: NotebookFormat) => {
    if (!user?.id || !exercise) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const notebookState = JSON.stringify(notebook);

      // Check if already passed
      const existingAttempt = attempts.find(a => a.passed);
      const passed = false; // Could be determined by running tests

      const { error } = await supabase.from('notebook_attempts').insert({
        user_id: user.id,
        exercise_id: exercise.id,
        notebook_state: notebookState,
        passed,
      });

      if (error) throw error;

      setAttempts([
        {
          id: crypto.randomUUID(),
          user_id: user.id,
          exercise_id: exercise.id,
          notebook_state: notebookState,
          passed,
          attempted_at: new Date().toISOString(),
        },
        ...attempts,
      ]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving notebook:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading notebook...</div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="text-slate-400">Notebook not found</div>
        <Link to="/notebooks" className="text-emerald-300 underline">
          Back to Notebook Labs
        </Link>
      </div>
    );
  }

  const initialNotebook = exercise.notebook_content as unknown as NotebookFormat;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto max-w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/notebooks"
                className="text-slate-400 hover:text-slate-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-slate-200">{exercise.title}</h1>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    exercise.difficulty === 'easy'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : exercise.difficulty === 'medium'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}>
                    {exercise.difficulty}
                  </span>
                </div>
                {exercise.description && (
                  <p className="text-sm text-slate-400 mt-1 line-clamp-1">{exercise.description}</p>
              )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </div>
              )}
              {attempts.length > 0 && (
                <span className="text-xs text-slate-500">
                  {attempts.length} attempt{attempts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notebook */}
      <div className="flex-1 h-[calc(100vh-60px)]">
        <JupyterNotebook
          initialNotebook={initialNotebook}
          onSave={handleSave}
          title={exercise.title}
          showHeader={false}
        />
      </div>

      <BrandFooter />
    </div>
  );
}
