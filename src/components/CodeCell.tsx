/**
 * Code Cell Component
 * Displays a code cell with editor, toolbar, and output
 */
import { useState } from 'react';
import { Play, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import type { NotebookUICell, CellOutput } from '@/lib/notebook.types';
import { cn } from '@/lib/utils';

interface CodeCellProps {
  cell: NotebookUICell;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (content: string) => void;
  onRun: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
}

export function CodeCell({
  cell,
  isSelected,
  onSelect,
  onUpdate,
  onRun,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddAbove,
  onAddBelow,
}: CodeCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(cell.content);

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate(content);
  };

  const handleRun = () => {
    onUpdate(content);
    onRun();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) {
      e.preventDefault();
      handleBlur();
      handleRun();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setContent(cell.content); // Revert
    }
  };

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        isSelected
          ? 'border-amber-500/50 bg-amber-500/5'
          : 'border-slate-700 bg-slate-900/50'
      )}
      onClick={onSelect}
    >
      {/* Input Area */}
      <div className="flex items-start gap-2 p-3 border-b border-slate-800">
        {/* Execution Indicator */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          {cell.executionCount !== null ? (
            <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center">
              {cell.executionCount}
            </div>
          ) : (
            <div className="h-5 w-5 rounded-full border border-slate-600" />
          )}
        </div>

        {/* Code Editor */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[60px] bg-slate-950 text-slate-200 font-mono text-sm p-2 rounded border border-slate-700 focus:border-amber-500 focus:outline-none resize-y"
              autoFocus
              placeholder="# Write your Python code here..."
            />
          ) : (
            <pre
              className="text-slate-300 font-mono text-sm whitespace-pre-wrap cursor-text"
              onClick={() => setIsEditing(true)}
            >
              {cell.content || <span className="text-slate-500"># Click to add code...</span>}
            </pre>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {(isSelected || isEditing) && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
          <div className="flex items-center gap-1">
            <button
              onClick={onMoveUp}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
              title="Move cell up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={onMoveDown}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
              title="Move cell down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onAddAbove}
              className="px-3 py-1.5 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              + Above
            </button>
            <button
              onClick={onAddBelow}
              className="px-3 py-1.5 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              + Below
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
              title="Delete cell"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Output Area */}
      {cell.outputs.length > 0 && (
        <div className="p-3 bg-slate-950/50">
          {cell.outputs.map((output, i) => (
            <CellOutput key={i} output={output} />
          ))}
        </div>
      )}

      {/* Running Indicator */}
      {cell.isRunning && (
        <div className="flex items-center gap-2 px-3 py-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Running...
        </div>
      )}

      {/* Empty state hint */}
      {cell.outputs.length === 0 && !cell.isRunning && isSelected && (
        <div className="flex items-center gap-2 px-3 py-2 text-slate-500 text-xs">
          <span>Shift+Enter</span>
          <span>to run</span>
        </div>
      )}
    </div>
  );
}

interface CellOutputProps {
  output: CellOutput;
}

function CellOutput({ output }: CellOutputProps) {
  if (output.output_type === 'stream') {
    const text = Array.isArray(output.text) ? output.text.join('') : output.text;
    return (
      <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
        {text}
      </pre>
    );
  }

  if (output.output_type === 'error') {
    return (
      <div className="rounded bg-rose-950/30 border border-rose-900/50 p-3 text-sm">
        <div className="font-semibold text-rose-400">
          {output.ename}: {output.evalue}
        </div>
        {output.traceback && output.traceback.length > 0 && (
          <pre className="mt-2 text-rose-300 whitespace-pre-wrap">
            {output.traceback.join('\n')}
          </pre>
        )}
      </div>
    );
  }

  if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
    // Handle rich output (images, HTML, etc.)
    const text = output.data['text/plain'] as string | string[] | undefined;
    if (text) {
      const textStr = Array.isArray(text) ? text.join('') : text;
      return (
        <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
          {textStr}
        </pre>
      );
    }
  }

  return null;
}
