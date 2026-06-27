import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/external';
import { useAuthCtx } from '@/lib/auth-context';
import { BrandFooter } from '@/components/BrandFooter';
import {
  Plus, FileText, Edit, Trash2, Eye, EyeOff,
  BookOpen, Filter, Search, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { NotebookExercise } from '@/lib/notebook.types';

export const Route = createFileRoute('/_authenticated/admin/notebooks')({
  component: AdminNotebooks,
});

function AdminNotebooks() {
  const { user, isAdmin } = useAuthCtx();
  const [exercises, setExercises] = useState<NotebookExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<NotebookExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; title: string }>({
    open: false,
    id: null,
    title: '',
  });

  useEffect(() => {
    if (!user?.id || !isAdmin) return;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('notebook_exercises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notebooks:', error);
      } else {
        setExercises(data ?? []);
        setFilteredExercises(data ?? []);
      }

      setLoading(false);
    })();
  }, [user?.id, isAdmin]);

  // Apply filters
  useEffect(() => {
    let filtered = [...exercises];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.topic?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'published') {
      filtered = filtered.filter((e) => e.is_published);
    } else if (statusFilter === 'draft') {
      filtered = filtered.filter((e) => !e.is_published);
    }

    setFilteredExercises(filtered);
  }, [exercises, searchQuery, statusFilter]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    const { error } = await supabase
      .from('notebook_exercises')
      .delete()
      .eq('id', deleteDialog.id);

    if (error) {
      console.error('Error deleting notebook:', error);
    } else {
      setExercises(exercises.filter((e) => e.id !== deleteDialog.id));
      setDeleteDialog({ open: false, id: null, title: '' });
    }
  };

  // Handle toggle publish
  const handleTogglePublish = async (exercise: NotebookExercise) => {
    const { error } = await supabase
      .from('notebook_exercises')
      .update({ is_published: !exercise.is_published })
      .eq('id', exercise.id);

    if (error) {
      console.error('Error toggling publish status:', error);
    } else {
      setExercises(exercises.map((e) =>
        e.id === exercise.id ? { ...e, is_published: !e.is_published } : e
      ));
    }
  };

  // Handle duplicate
  const handleDuplicate = async (exercise: NotebookExercise) => {
    const { data, error } = await supabase
      .from('notebook_exercises')
      .insert({
        title: `${exercise.title} (Copy)`,
        description: exercise.description,
        topic: exercise.topic,
        difficulty: exercise.difficulty,
        estimated_minutes: exercise.estimated_minutes,
        notebook_content: exercise.notebook_content,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error duplicating notebook:', error);
    } else if (data) {
      setExercises([data as NotebookExercise, ...exercises]);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-slate-400">Access denied. Admin privileges required.</div>
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
              <ChevronDown className="h-5 w-5 rotate-90" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-200">Manage Notebooks</h1>
              <p className="text-xs text-slate-400">Create and manage notebook exercises</p>
            </div>
          </div>
          <Link to="/admin/notebooks/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Notebook
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search notebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/50 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter className="h-4 w-4" />
            <span>Status:</span>
          </div>

          <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
            {(['all', 'published', 'draft'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  statusFilter === status
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="ml-auto text-sm text-slate-400">
            {filteredExercises.length} notebook{filteredExercises.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Notebooks List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading notebooks...</div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {exercises.length === 0 ? (
              <div className="flex flex-col items-center gap-4">
                <BookOpen className="h-12 w-12 text-slate-600" />
                <p>No notebooks yet. Create your first notebook exercise!</p>
                <Link to="/admin/notebooks/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Notebook
                  </Button>
                </Link>
              </div>
            ) : (
              'No notebooks match your filters.'
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExercises.map((exercise) => {
              const difficultyColor = {
                easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                hard: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
              }[exercise.difficulty];

              return (
                <div
                  key={exercise.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        <h3 className="font-semibold text-slate-200 truncate">
                          {exercise.title}
                        </h3>
                        {exercise.is_published ? (
                          <Eye className="h-4 w-4 text-emerald-400" title="Published" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-slate-500" title="Draft" />
                        )}
                      </div>
                      {exercise.description && (
                        <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                          {exercise.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${difficultyColor}`}>
                          {exercise.difficulty}
                        </span>
                        {exercise.topic && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                            {exercise.topic}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {exercise.estimated_minutes} min
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                          Actions
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/notebooks/$notebookId" params={{ notebookId: exercise.id }} className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTogglePublish(exercise)} className="gap-2">
                          {exercise.is_published ? (
                            <>
                              <EyeOff className="h-4 w-4" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              Publish
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(exercise)} className="gap-2">
                          <FileText className="h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteDialog({ open: true, id: exercise.id, title: exercise.title })}
                          className="gap-2 text-rose-400 focus:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BrandFooter />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notebook?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
