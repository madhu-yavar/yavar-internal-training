import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/external';
import { useAuthCtx } from '@/lib/auth-context';
import { BrandFooter } from '@/components/BrandFooter';
import { BookOpen, FileText, Clock, Filter, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NotebookExercise } from '@/lib/notebook.types';

export const Route = createFileRoute('/_authenticated/notebooks/')({
  component: NotebooksHub,
});

function NotebooksHub() {
  const { user, isAdmin } = useAuthCtx();
  const [exercises, setExercises] = useState<NotebookExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<NotebookExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      setLoading(true);

      // Fetch published notebook exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('notebook_exercises')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (exercisesError) {
        console.error('Error fetching notebook exercises:', exercisesError);
      } else {
        setExercises(exercisesData ?? []);
        setFilteredExercises(exercisesData ?? []);
      }

      // Fetch user's completed notebooks
      const { data: attemptsData } = await supabase
        .from('notebook_attempts')
        .select('exercise_id')
        .eq('user_id', user.id)
        .eq('passed', true);

      const completed = new Set(attemptsData?.map((a) => a.exercise_id) ?? []);
      setCompletedExercises(completed);

      setLoading(false);
    })();
  }, [user?.id]);

  // Apply filters
  useEffect(() => {
    let filtered = [...exercises];

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter((e) => e.difficulty === difficultyFilter);
    }

    if (topicFilter) {
      filtered = filtered.filter((e) => e.topic === topicFilter);
    }

    setFilteredExercises(filtered);
  }, [exercises, difficultyFilter, topicFilter]);

  // Get unique topics
  const topics = Array.from(new Set(exercises.map((e) => e.topic).filter(Boolean)));

  const difficultyCount = {
    all: exercises.length,
    easy: exercises.filter((e) => e.difficulty === 'easy').length,
    medium: exercises.filter((e) => e.difficulty === 'medium').length,
    hard: exercises.filter((e) => e.difficulty === 'hard').length,
  };

  const completedCount = completedExercises.size;
  const totalCount = exercises.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/yavar-logo.png" alt="Yavar" className="h-8 w-auto" />
            <div className="border-l border-white/10 pl-2">
              <div className="text-sm font-semibold leading-none">Yavar Learn</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">Notebook Labs</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-slate-400 sm:inline">{user?.email}</span>
            <Link
              to="/sandbox"
              className="px-3 py-1.5 rounded-md border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
            >
              🐍 Sandbox
            </Link>
            {isAdmin && (
              <Link to="/admin/notebooks" className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20">
                Manage
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Hero Section */}
        <div className="mb-8 rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-emerald-200 sm:text-3xl">Notebook Labs</h1>
              <p className="mt-2 text-slate-300">
                Interactive Jupyter notebooks in your browser! Work with code cells, markdown, and rich output.
                Perfect for data exploration and step-by-step learning.
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-4xl">
              📓
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4 sm:gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-300">{totalCount}</div>
              <div className="text-xs text-slate-400">Notebooks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-300">{completedCount}</div>
              <div className="text-xs text-slate-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-300">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-400">Progress</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter className="h-4 w-4" />
            <span>Filter:</span>
          </div>

          {/* Difficulty Filter */}
          <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  difficultyFilter === diff
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {diff === 'all' ? 'All' : diff.charAt(0).toUpperCase() + diff.slice(1)} ({difficultyCount[diff]})
              </button>
            ))}
          </div>

          {/* Topic Filter */}
          {topics.length > 0 && (
            <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
              <button
                onClick={() => setTopicFilter(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  topicFilter === null
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                All Topics
              </button>
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setTopicFilter(topic ?? null)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    topicFilter === topic
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exercise Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading notebooks...</div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {exercises.length === 0
              ? 'No notebooks available yet. Check back soon!'
              : 'No notebooks match your filters.'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExercises.map((exercise) => {
              const isCompleted = completedExercises.has(exercise.id);
              const difficultyColor = {
                easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                hard: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
              }[exercise.difficulty];

              return (
                <Link
                  key={exercise.id}
                  to="/notebooks/$notebookId"
                  params={{ notebookId: exercise.id }}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-400/50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-semibold group-hover:text-emerald-300 truncate">
                          {exercise.title}
                        </h3>
                        {isCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-400 line-clamp-2">{exercise.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${difficultyColor}`}>
                      {exercise.difficulty}
                    </span>
                    {exercise.topic && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {exercise.topic}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      {exercise.estimated_minutes}m
                    </span>
                  </div>

                  <div className="mt-3 text-[11px] text-emerald-300">
                    {isCompleted ? 'Review notebook →' : 'Start notebook →'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BrandFooter />
    </div>
  );
}
