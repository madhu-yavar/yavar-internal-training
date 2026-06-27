import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { supabase } from '@/integrations/supabase/external';
import { useAuthCtx } from '@/lib/auth-context';
import { PythonSandbox } from '@/components/PythonSandbox';
import { Button } from '@/components/ui/button';
import { BrandFooter } from '@/components/BrandFooter';
import { ArrowLeft, Lightbulb, Send, Loader2, CheckCircle2, History } from 'lucide-react';
import type { TestCase, TestResults, SandboxExercise, AIReview } from '@/lib/sandbox.types';

export const Route = createFileRoute('/_authenticated/sandbox/$exerciseId')({
  component: ExerciseEditor,
});

function ExerciseEditor() {
  const { exerciseId } = Route.useParams();
  const { user } = useAuthCtx();
  const navigate = { to: '/sandbox' };

  const [exercise, setExercise] = useState<SandboxExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [hasPassed, setHasPassed] = useState(false);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Code Review Chat
  const { messages, handleSubmit, setInput, input, isLoading } = useChat({
    api: '/api/ai-code-review',
    body: {
      code,
      exerciseTitle: exercise?.title ?? '',
      exerciseDescription: exercise?.description ?? '',
      exerciseInstructions: exercise?.instructions ?? '',
      testResults: testResults?.results ?? [],
    },
    initialMessages: [],
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch exercise data
  useEffect(() => {
    if (!user?.id || !exerciseId) return;

    (async () => {
      setLoading(true);

      // Fetch exercise
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('sandbox_exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (exerciseError || !exerciseData) {
        console.error('Error fetching exercise:', exerciseError);
        setLoading(false);
        return;
      }

      setExercise(exerciseData as SandboxExercise);
      setCode(exerciseData.starter_code ?? '');

      // Fetch attempts
      const { data: attemptsData } = await supabase
        .from('sandbox_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .order('attempted_at', { ascending: false })
        .limit(5);

      setAttempts(attemptsData ?? []);

      // Check if user has previously passed this exercise
      const passedAttempt = attemptsData?.find((a) => a.passed);
      if (passedAttempt) {
        setHasPassed(true);
      }

      setLoading(false);
    })();
  }, [user?.id, exerciseId]);

  // Handle code run/test completion
  const handleRun = () => {
    // Triggered when user runs code
  };

  // Handle save attempt
  const handleSave = async (submittedCode: string) => {
    if (!testResults || !user?.id || !exerciseId) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await supabase.from('sandbox_attempts').insert({
        user_id: user.id,
        exercise_id: exerciseId,
        code_submitted: submittedCode,
        test_results: testResults,
        passed: testResults.passed,
      });

      setHasPassed(testResults.passed);

      // Clear save success message after 3 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }, 100);
    } catch (error) {
      console.error('Error saving attempt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Request AI review
  const requestAIReview = () => {
    if (!code) return;
    setInput('Review my code and provide feedback on how I can improve it.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading exercise...</div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="text-slate-400">Exercise not found</div>
        <Link to={navigate.to} className="text-amber-300 underline">
          Back to Practice
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto max-w-[1800px] px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              to="/sandbox"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Practice
            </Link>

            <div className="flex items-center gap-3">
              {hasPassed && (
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </div>
              )}

              {exercise.hints && exercise.hints.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHints(!showHints)}
                  className="text-amber-300 hover:text-amber-200"
                >
                  <Lightbulb className="h-4 w-4 mr-1" />
                  Hints
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={requestAIReview}
                disabled={!code || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                AI Review
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Exercise Info & AI Chat */}
        <div className="w-full lg:w-96 flex-shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col overflow-hidden">
          {/* Exercise Info */}
          <div className="flex-shrink-0 p-4 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                exercise.difficulty === 'easy'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : exercise.difficulty === 'medium'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                {exercise.difficulty}
              </span>
              {exercise.topic && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                  {exercise.topic}
                </span>
              )}
            </div>

            <h1 className="text-lg font-bold text-amber-200">{exercise.title}</h1>
            <p className="mt-2 text-sm text-slate-300">{exercise.description}</p>

            {exercise.instructions && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <h3 className="text-xs font-semibold text-slate-400 mb-1">Instructions</h3>
                <p className="text-sm text-slate-300 whitespace-pre-line">{exercise.instructions}</p>
              </div>
            )}

            {/* Hints Panel */}
            {showHints && exercise.hints && exercise.hints.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-700/30 bg-amber-500/10 p-3">
                <h3 className="text-xs font-semibold text-amber-300 mb-2">Hints</h3>
                <ul className="space-y-1">
                  {exercise.hints.map((hint, i) => (
                    <li key={i} className="text-xs text-slate-300">
                      • {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* AI Chat Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-xs font-semibold text-slate-400">AI Tutor</h3>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Run your code and click "AI Review" to get personalized feedback on your solution.
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg p-3 text-sm ${
                    message.role === 'user'
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="text-slate-300">{message.content}</div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ari is thinking...</span>
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-shrink-0 p-3 border-t border-slate-800 bg-slate-900/50"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for help or request a code review..."
                  className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input?.trim() || isLoading}
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Code Editor */}
        <div className="flex-1 h-[600px] lg:h-auto">
          <PythonSandbox
            starterCode={code}
            testCases={exercise.test_cases ?? []}
            onRun={handleRun}
            onSave={handleSave}
          />
        </div>
      </div>

      <BrandFooter />
    </div>
  );
}
