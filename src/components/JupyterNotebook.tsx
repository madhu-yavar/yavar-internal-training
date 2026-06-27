/**
 * JupyterNotebook Component
 * Main notebook interface with cell management
 */
import { useEffect } from 'react';
import { Play, Save, Download, Upload, Plus, FileText, Code, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotebookState } from '@/hooks/useNotebookState';
import { usePyodideKernel } from '@/hooks/usePyodideKernel';
import { CodeCell } from '@/components/CodeCell';
import { MarkdownCell } from '@/components/MarkdownCell';
import type { NotebookFormat } from '@/lib/notebook.types';
import { cn } from '@/lib/utils';

interface JupyterNotebookProps {
  initialNotebook?: NotebookFormat;
  onSave?: (notebook: NotebookFormat) => void;
  readOnly?: boolean;
  title?: string;
  showHeader?: boolean;
  autoSave?: boolean;
  className?: string;
}

export function JupyterNotebook({
  initialNotebook,
  onSave,
  readOnly = false,
  title,
  showHeader = true,
  autoSave = false,
  className,
}: JupyterNotebookProps) {
  const { runPython, isReady: pyodideReady } = usePyodideKernel();

  const notebook = useNotebookState(runPython, {
    initialNotebook,
    onSave,
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+Enter to run cell
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (notebook.selectedCellId) {
          notebook.runCell(notebook.selectedCellId);
        }
      }
      // Ctrl+Enter to run and advance
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (notebook.selectedCellId) {
          notebook.runCell(notebook.selectedCellId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notebook.selectedCellId, notebook.runCell]);

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !onSave) return;

    const timer = setTimeout(() => {
      if (notebook.cells.length > 0) {
        notebook.save();
      }
    }, 2000); // Save 2 seconds after last change

    return () => clearTimeout(timer);
  }, [notebook.cells, autoSave, onSave]);

  const handleExport = () => {
    const exported = notebook.exportNotebook();
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title?.replace(/[^a-z0-9]/gi, '_') || 'notebook'}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ipynb';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content) as NotebookFormat;
            notebook.loadNotebook(parsed);
          } catch (error) {
            console.error('Failed to parse notebook:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (!pyodideReady) {
    return (
      <div className={cn('h-full flex items-center justify-center bg-slate-950', className)}>
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading Python environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col bg-slate-950', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-slate-200">{title || 'Notebook'}</h2>
              <span className="text-xs text-slate-500">
                {notebook.cells.filter(c => c.type === 'code').length} code cells
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!readOnly && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleImport}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExport}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => notebook.runAllCells()}
                    disabled={notebook.isRunning}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Run All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => notebook.save()}
                    disabled={notebook.isSaving}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {notebook.isSaving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    {notebook.isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cells Container */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {notebook.cells.map((cell, index) => (
          <div key={cell.id} className="relative group">
            {cell.type === 'code' ? (
              <CodeCell
                cell={cell}
                isSelected={notebook.selectedCellId === cell.id}
                onSelect={() => notebook.selectCell(cell.id)}
                onUpdate={(content) => notebook.updateCellContent(cell.id, content)}
                onRun={() => notebook.runCell(cell.id)}
                onDelete={() => notebook.deleteCell(cell.id)}
                onMoveUp={() => notebook.moveCellUp(cell.id)}
                onMoveDown={() => notebook.moveCellDown(cell.id)}
                onAddAbove={() => notebook.addMarkdownCell(notebook.cells[index - 1]?.id)}
                onAddBelow={() => notebook.addCodeCell(cell.id)}
              />
            ) : (
              <MarkdownCell
                cell={cell}
                isSelected={notebook.selectedCellId === cell.id}
                onSelect={() => notebook.selectCell(cell.id)}
                onUpdate={(content) => notebook.updateCellContent(cell.id, content)}
                onDelete={() => notebook.deleteCell(cell.id)}
                onMoveUp={() => notebook.moveCellUp(cell.id)}
                onMoveDown={() => notebook.moveCellDown(cell.id)}
                onAddAbove={() => notebook.addMarkdownCell(notebook.cells[index - 1]?.id)}
                onAddBelow={() => notebook.addCodeCell(cell.id)}
              />
            )}
          </div>
        ))}

        {/* Empty State */}
        {notebook.cells.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">This notebook is empty</p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => notebook.addMarkdownCell()}
                className="border-slate-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Markdown
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => notebook.addCodeCell()}
                className="border-slate-700"
              >
                <Code className="h-4 w-4 mr-2" />
                Add Code
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Toolbar */}
      {!readOnly && (
        <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => notebook.addMarkdownCell(notebook.selectedCellId || undefined)}
                className="border-slate-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                <FileText className="h-4 w-4 mr-1" />
                Markdown
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => notebook.addCodeCell(notebook.selectedCellId || undefined)}
                className="border-slate-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                <Code className="h-4 w-4 mr-1" />
                Code
              </Button>
            </div>

            <div className="text-xs text-slate-500">
              {notebook.isRunning && (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Running cells...
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
