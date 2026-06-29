/**
 * Markdown Cell Component
 * Displays markdown content with editing capability
 */
import { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { NotebookUICell } from '@/lib/notebook.types';

interface MarkdownCellProps {
  cell: NotebookUICell;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (content: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
}

export function MarkdownCell({
  cell,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddAbove,
  onAddBelow,
}: MarkdownCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(cell.content);

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
          : 'border-transparent bg-transparent'
      )}
      onClick={onSelect}
    >
      {/* Toolbar */}
      {isSelected && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border rounded-t-lg">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <FileText className="h-4 w-4" />
            <span>Markdown</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onMoveUp}
              className="p-1.5 rounded hover:bg-muted-foreground/20 text-muted-foreground hover:text-card-foreground"
              title="Move cell up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={onMoveDown}
              className="p-1.5 rounded hover:bg-muted-foreground/20 text-muted-foreground hover:text-card-foreground"
              title="Move cell down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={onAddAbove}
              className="px-3 py-1.5 text-xs rounded bg-muted text-card-foreground hover:bg-muted-foreground/20"
            >
              + Above
            </button>
            <button
              onClick={onAddBelow}
              className="px-3 py-1.5 text-xs rounded bg-muted text-card-foreground hover:bg-muted-foreground/20"
            >
              + Below
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400"
              title="Delete cell"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[80px] bg-background text-card-foreground p-3 rounded border-0 focus:border-0 focus:outline-none resize-y font-mono text-sm"
          autoFocus
          placeholder="# Write markdown here..."
        />
      ) : (
        <div
          className="p-4 prose prose-invert prose-sm max-w-none cursor-text"
          onClick={() => isSelected && setIsEditing(true)}
        >
          {cell.content ? (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold text-card-foreground mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold text-card-foreground mb-2 mt-4">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold text-card-foreground mb-2 mt-3">{children}</h3>,
                p: ({ children }) => <p className="text-card-foreground mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside text-card-foreground mb-2 ml-4">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside text-card-foreground mb-2 ml-4">{children}</ol>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-muted text-emerald-300 px-1 py-0.5 rounded text-sm">{children}</code>
                  ) : (
                    <code className="block bg-muted text-card-foreground p-2 rounded text-sm overflow-x-auto">{children}</code>
                  );
                },
                pre: ({ children }) => <pre className="bg-muted p-2 rounded overflow-x-auto mb-2">{children}</pre>,
              }}
            >
              {cell.content}
            </ReactMarkdown>
          ) : (
            <div className="text-muted-foreground italic" onClick={() => setIsEditing(true)}>
              # Click to add markdown...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
