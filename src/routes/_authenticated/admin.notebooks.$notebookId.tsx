import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/external';
import { useAuthCtx } from '@/lib/auth-context';
import { JupyterNotebook } from '@/components/JupyterNotebook';
import {
  ArrowLeft, Save, Loader2, Settings, Eye, EyeOff,
  CheckCircle2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import type { NotebookFormat, NotebookExercise } from '@/lib/notebook.types';
import { createEmptyNotebook } from '@/lib/notebook-utils';

export const Route = createFileRoute('/_authenticated/admin/notebooks/$notebookId')({
  component: AdminNotebookEditor,
});

const BLANK_NOTEBOOK: Omit<NotebookExercise, 'id' | 'created_at' | 'updated_at'> = {
  title: 'New Notebook',
  description: '',
  topic: '',
  difficulty: 'easy',
  estimated_minutes: 15,
  is_published: false,
  notebook_content: createEmptyNotebook(),
};

function AdminNotebookEditor() {
  const { notebookId } = Route.useParams();
  const { user, isAdmin } = useAuthCtx();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<(NotebookExercise & typeof BLANK_NOTEBOOK) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Temporary settings state
  const [settings, setSettings] = useState({
    title: '',
    description: '',
    topic: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    estimated_minutes: 15,
    is_published: false,
  });

  useEffect(() => {
    if (!user?.id || !isAdmin) return;

    if (notebookId === 'new') {
      setExercise({ id: 'new', ...BLANK_NOTEBOOK, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any);
      setSettings(BLANK_NOTEBOOK);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('notebook_exercises')
        .select('*')
        .eq('id', notebookId)
        .single();

      if (error || !data) {
        console.error('Error fetching notebook:', error);
        setLoading(false);
        return;
      }

      setExercise(data as NotebookExercise);
      setSettings({
        title: data.title,
        description: data.description ?? '',
        topic: data.topic ?? '',
        difficulty: data.difficulty,
        estimated_minutes: data.estimated_minutes,
        is_published: data.is_published,
      });

      setLoading(false);
    })();
  }, [user?.id, isAdmin, notebookId]);

  // Apply settings
  const applySettings = () => {
    if (!exercise) return;

    setExercise({
      ...exercise,
      title: settings.title,
      description: settings.description,
      topic: settings.topic,
      difficulty: settings.difficulty,
      estimated_minutes: settings.estimated_minutes,
      is_published: settings.is_published,
    });

    setSettingsOpen(false);
    setUnsavedChanges(true);
  };

  // Handle save
  const handleSave = async (notebook: NotebookFormat) => {
    if (!user?.id || !exercise) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        title: exercise.title,
        description: exercise.description,
        topic: exercise.topic,
        difficulty: exercise.difficulty,
        estimated_minutes: exercise.estimated_minutes,
        is_published: exercise.is_published,
        notebook_content: notebook,
      };

      let result;

      if (exercise.id === 'new') {
        // Create new
        const { data, error } = await supabase
          .from('notebook_exercises')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Navigate to the new notebook's ID
        navigate({ to: '/admin/notebooks/$notebookId', params: { notebookId: result.id }, replace: true });
      } else {
        // Update existing
        const { data, error } = await supabase
          .from('notebook_exercises')
          .update(payload)
          .eq('id', exercise.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      if (result) {
        setExercise(result as NotebookExercise);
        setUnsavedChanges(false);
      }

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
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="text-slate-400">Notebook not found</div>
        <Link to="/admin/notebooks" className="text-emerald-300 underline">
          Back to Notebooks
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
                to="/admin/notebooks"
                className="text-slate-400 hover:text-slate-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-slate-200">{exercise.title}</h1>
                <p className="text-xs text-slate-500">
                  {exercise.id === 'new' ? 'Creating new notebook' : 'Editing notebook'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unsavedChanges && (
                <span className="text-xs text-amber-400">Unsaved changes</span>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </div>
              )}
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}

              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Notebook Settings</SheetTitle>
                    <SheetDescription>
                      Configure metadata and visibility for this notebook.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={settings.title}
                        onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                        className="bg-slate-900 border-slate-800"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={settings.description}
                        onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                        rows={3}
                        className="bg-slate-900 border-slate-800"
                      />
                    </div>

                    <div>
                      <Label htmlFor="topic">Topic</Label>
                      <Input
                        id="topic"
                        value={settings.topic}
                        onChange={(e) => setSettings({ ...settings, topic: e.target.value })}
                        placeholder="e.g., Data Analysis, Machine Learning"
                        className="bg-slate-900 border-slate-800"
                      />
                    </div>

                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={settings.difficulty}
                        onValueChange={(value: any) => setSettings({ ...settings, difficulty: value })}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="estimated_minutes">Estimated Time (minutes)</Label>
                      <Input
                        id="estimated_minutes"
                        type="number"
                        value={settings.estimated_minutes}
                        onChange={(e) => setSettings({ ...settings, estimated_minutes: parseInt(e.target.value) || 15 })}
                        className="bg-slate-900 border-slate-800"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="published">Published</Label>
                        <p className="text-xs text-slate-400">Make visible to users</p>
                      </div>
                      <button
                        id="published"
                        type="button"
                        onClick={() => setSettings({ ...settings, is_published: !settings.is_published })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.is_published ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            settings.is_published ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <SheetFooter>
                    <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={applySettings} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Apply Changes
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
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
          autoSave={true}
        />
      </div>
    </div>
  );
}
