/**
 * Notebook State Management Hook
 * Manages cell state, selection, execution for Jupyter notebooks
 */
import { useState, useCallback, useRef } from 'react';
import type { NotebookUICell, NotebookFormat } from '@/lib/notebook.types';
import {
  notebookToUIState,
  createCodeCell,
  createMarkdownCell,
  uiStateToNotebook,
} from '@/lib/notebook-utils';

interface UseNotebookStateOptions {
  initialNotebook?: NotebookFormat;
  onSave?: (notebook: NotebookFormat) => void;
}

interface NotebookState {
  cells: NotebookUICell[];
  selectedCellId: string | null;
  isRunning: boolean;
  isSaving: boolean;
  executionCount: number;
}

interface NotebookActions {
  selectCell: (cellId: string | null) => void;
  updateCellContent: (cellId: string, content: string) => void;
  addCodeCell: (afterCellId?: string) => void;
  addMarkdownCell: (afterCellId?: string) => void;
  deleteCell: (cellId: string) => void;
  moveCellUp: (cellId: string) => void;
  moveCellDown: (cellId: string) => void;
  runCell: (cellId: string) => Promise<void>;
  runAllCells: () => Promise<void>;
  clearOutput: (cellId: string) => void;
  save: () => Promise<void>;
  loadNotebook: (notebook: NotebookFormat) => void;
  exportNotebook: () => NotebookFormat;
}

export function useNotebookState(
  runPython: (code: string) => Promise<{ output: string[]; error: string | null }>,
  options: UseNotebookStateOptions = {}
) {
  const { initialNotebook, onSave } = options;

  // State
  const [state, setState] = useState<NotebookState>(() => ({
    cells: initialNotebook ? notebookToUIState(initialNotebook) : [],
    selectedCellId: initialNotebook?.cells[0]?.id || null,
    isRunning: false,
    isSaving: false,
    executionCount: 0,
  }));

  const executionCounterRef = useRef(1);

  /**
   * Select a cell
   */
  const selectCell = useCallback((cellId: string | null) => {
    setState(prev => ({ ...prev, selectedCellId: cellId }));
  }, []);

  /**
   * Update cell content
   */
  const updateCellContent = useCallback((cellId: string, content: string) => {
    setState(prev => ({
      ...prev,
      cells: prev.cells.map(cell =>
        cell.id === cellId ? { ...cell, content } : cell
      ),
    }));
  }, []);

  /**
   * Add a code cell
   */
  const addCodeCell = useCallback((afterCellId?: string) => {
    const newCell: NotebookUICell = {
      id: crypto.randomUUID(),
      type: 'code',
      content: '',
      outputs: [],
      executionCount: null,
      isRunning: false,
      isExpanded: true,
    };

    setState(prev => {
      const newCells = [...prev.cells];
      if (afterCellId) {
        const index = newCells.findIndex(c => c.id === afterCellId);
        newCells.splice(index + 1, 0, newCell);
      } else {
        newCells.push(newCell);
      }
      return { ...prev, cells: newCells, selectedCellId: newCell.id };
    });
  }, []);

  /**
   * Add a markdown cell
   */
  const addMarkdownCell = useCallback((afterCellId?: string) => {
    const newCell: NotebookUICell = {
      id: crypto.randomUUID(),
      type: 'markdown',
      content: '',
      outputs: [],
      executionCount: null,
      isRunning: false,
      isExpanded: true,
    };

    setState(prev => {
      const newCells = [...prev.cells];
      if (afterCellId) {
        const index = newCells.findIndex(c => c.id === afterCellId);
        newCells.splice(index + 1, 0, newCell);
      } else {
        newCells.push(newCell);
      }
      return { ...prev, cells: newCells, selectedCellId: newCell.id };
    });
  }, []);

  /**
   * Delete a cell
   */
  const deleteCell = useCallback((cellId: string) => {
    setState(prev => {
      const newCells = prev.cells.filter(c => c.id !== cellId);
      const index = prev.cells.findIndex(c => c.id === cellId);
      const newSelectedId = newCells[Math.min(index, newCells.length - 1)]?.id || null;

      return {
        ...prev,
        cells: newCells,
        selectedCellId: newSelectedId,
      };
    });
  }, []);

  /**
   * Move cell up
   */
  const moveCellUp = useCallback((cellId: string) => {
    setState(prev => {
      const newCells = [...prev.cells];
      const index = newCells.findIndex(c => c.id === cellId);

      if (index === 0) return prev; // Already at top

      // Swap with previous cell
      [newCells[index], newCells[index - 1]] = [newCells[index - 1], newCells[index]];

      return { ...prev, cells: newCells };
    });
  }, []);

  /**
   * Move cell down
   */
  const moveCellDown = useCallback((cellId: string) => {
    setState(prev => {
      const newCells = [...prev.cells];
      const index = newCells.findIndex(c => c.id === cellId);

      if (index === newCells.length - 1) return prev; // Already at bottom

      // Swap with next cell
      [newCells[index], newCells[index + 1]] = [newCells[index + 1], newCells[index]];

      return { ...prev, cells: newCells };
    });
  }, []);

  /**
   * Run a single cell
   */
  const runCell = useCallback(async (cellId: string) => {
    const cell = state.cells.find(c => c.id === cellId);
    if (!cell || cell.type !== 'code') {
      return;
    }

    // Set running state
    setState(prev => ({
      ...prev,
      cells: prev.cells.map(c =>
        c.id === cellId ? { ...c, isRunning: true } : c
      ),
      isRunning: true,
    }));

    try {
      const result = await runPython(cell.content);

      const executionCount = executionCounterRef.current++;

      // Build outputs array from text and images
      const outputs: any[] = [];

      if (result.error) {
        outputs.push({
          output_type: 'error' as const,
          ename: 'Error',
          evalue: result.error,
          traceback: [result.error],
        });
      } else {
        // Add text outputs
        result.output.forEach((line: string) => {
          outputs.push({
            output_type: 'stream' as const,
            name: 'stdout',
            text: line,
          });
        });

        // Add image outputs
        result.images?.forEach((svgData: string) => {
          outputs.push({
            output_type: 'image' as const,
            mime_type: 'image/svg+xml',
            data: svgData,
          });
        });
      }

      setState(prev => ({
        ...prev,
        cells: prev.cells.map(c =>
          c.id === cellId
            ? {
                ...c,
                isRunning: false,
                outputs,
                executionCount,
              }
            : c
        ),
        isRunning: false,
        executionCount,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        cells: prev.cells.map(c =>
          c.id === cellId
            ? {
                ...c,
                isRunning: false,
                outputs: [
                  {
                    output_type: 'error' as const,
                    ename: 'RuntimeError',
                    evalue: error instanceof Error ? error.message : String(error),
                    traceback: [],
                  },
                ],
              }
            : c
        ),
        isRunning: false,
      }));
    }
  }, [state.cells, runPython]);

  /**
   * Run all code cells sequentially
   */
  const runAllCells = useCallback(async () => {
    const codeCells = state.cells.filter(c => c.type === 'code');
    setState(prev => ({ ...prev, isRunning: true }));

    for (const cell of codeCells) {
      await runCell(cell.id);
    }
  }, [state.cells, runCell]);

  /**
   * Clear output from a cell
   */
  const clearOutput = useCallback((cellId: string) => {
    setState(prev => ({
      ...prev,
      cells: prev.cells.map(c =>
        c.id === cellId
          ? { ...c, outputs: [], executionCount: null }
          : c
      ),
    }));
  }, []);

  /**
   * Save notebook
   */
  const save = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true }));

    const notebook = uiStateToNotebook(state.cells);

    if (onSave) {
      await onSave(notebook);
    }

    setState(prev => ({ ...prev, isSaving: false }));
  }, [state.cells, onSave]);

  /**
   * Load a notebook
   */
  const loadNotebook = useCallback((notebook: NotebookFormat) => {
    const cells = notebookToUIState(notebook);
    setState(prev => ({
      ...prev,
      cells,
      selectedCellId: cells[0]?.id || null,
    }));
  }, []);

  /**
   * Export current state as notebook
   */
  const exportNotebook = useCallback((): NotebookFormat => {
    return uiStateToNotebook(state.cells);
  }, [state.cells]);

  return {
    ...state,
    ...Object.fromEntries(
      Object.entries({
        selectCell,
        updateCellContent,
        addCodeCell,
        addMarkdownCell,
        deleteCell,
        moveCellUp,
        moveCellDown,
        runCell,
        runAllCells,
        clearOutput,
        save,
        loadNotebook,
        exportNotebook,
      }).map(([k, v]) => [k, v])
    )
  } as NotebookState & NotebookActions;
}
