/**
 * Notebook Utilities
 * Conversion between Jupyter format and internal UI state
 */
import type {
  NotebookFormat,
  NotebookUICell,
  NotebookCell,
  MarkdownCell,
  CodeCell,
} from './notebook.types';

/**
 * Convert source (string or string[]) to string
 */
export function sourceToString(source: string | string[]): string {
  if (Array.isArray(source)) {
    return source.join('');
  }
  return source;
}

/**
 * Convert string to source array (Jupyter format)
 */
export function stringToSource(str: string): string[] {
  return str.split('\n');
}

/**
 * Create a new markdown cell
 */
export function createMarkdownCell(content: string = ''): MarkdownCell {
  return {
    id: crypto.randomUUID(),
    cell_type: 'markdown',
    source: stringToSource(content),
    metadata: {},
  };
}

/**
 * Create a new code cell
 */
export function createCodeCell(content: string = ''): CodeCell {
  return {
    id: crypto.randomUUID(),
    cell_type: 'code',
    source: stringToSource(content),
    execution_count: null,
    outputs: [],
    metadata: {},
  };
}

/**
 * Convert Jupyter cell to UI cell
 */
export function notebookCellToUICell(cell: NotebookCell): NotebookUICell {
  const id = (cell as any).id || crypto.randomUUID();
  const content = sourceToString(cell.source);

  if (cell.cell_type === 'markdown') {
    return {
      id,
      type: 'markdown',
      content,
      outputs: [],
      executionCount: null,
      isRunning: false,
      isExpanded: true,
    };
  }

  // Code cell
  return {
    id,
    type: 'code',
    content,
    outputs: (cell as CodeCell).outputs || [],
    executionCount: (cell as CodeCell).execution_count || null,
    isRunning: false,
    isExpanded: true,
  };
}

/**
 * Convert UI cell to Jupyter cell
 */
export function uiCellToNotebookCell(cell: NotebookUICell): NotebookCell {
  if (cell.type === 'markdown') {
    return {
      id: cell.id,
      cell_type: 'markdown',
      source: stringToSource(cell.content),
      metadata: {},
    };
  }

  // Code cell
  return {
    id: cell.id,
    cell_type: 'code',
    source: stringToSource(cell.content),
    execution_count: cell.executionCount,
    outputs: cell.outputs,
    metadata: {},
  };
}

/**
 * Convert Jupyter notebook to UI state
 */
export function notebookToUIState(notebook: NotebookFormat): NotebookUICell[] {
  return notebook.cells.map(notebookCellToUICell);
}

/**
 * Convert UI state to Jupyter notebook
 */
export function uiStateToNotebook(
  cells: NotebookUICell[],
  metadata: NotebookFormat['metadata'] = {}
): NotebookFormat {
  return {
    nbformat: 4,
    nbformat_minor: 0,
    metadata,
    cells: cells.map(uiCellToNotebookCell),
  };
}

/**
 * Create a new empty notebook
 */
export function createEmptyNotebook(): NotebookFormat {
  return {
    nbformat: 4,
    nbformat_minor: 0,
    metadata: {
      language_info: {
        name: 'python',
        version: '3.10.0',
        mimetype: 'text/x-python',
        file_extension: '.py',
      },
      kernelspec: {
        name: 'python3',
        display_name: 'Python 3',
        language: 'python',
      },
    },
    cells: [
      createMarkdownCell('# Welcome to Notebook Labs\n\nStart coding in Python!'),
      createCodeCell('# Your code here\nprint("Hello, Notebook!")'),
    ],
  };
}

/**
 * Validate notebook format
 */
export function isValidNotebook(obj: unknown): obj is NotebookFormat {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const nb = obj as Partial<NotebookFormat>;
  return (
    nb.nbformat === 4 &&
    Array.isArray(nb.cells) &&
    typeof nb.metadata === 'object'
  );
}

/**
 * Parse .ipynb file content
 */
export function parseIPYNB(content: string): NotebookFormat | null {
  try {
    const notebook = JSON.parse(content);
    return isValidNotebook(notebook) ? notebook : null;
  } catch {
    return null;
  }
}

/**
 * Serialize notebook to .ipynb format
 */
export function serializeIPYNB(notebook: NotebookFormat): string {
  return JSON.stringify(notebook, null, 2);
}

/**
 * Create a sample notebook exercise
 */
export function createSampleNotebookExercise(): NotebookFormat {
  return {
    nbformat: 4,
    nbformat_minor: 0,
    metadata: {
      title: 'Hello World - Notebook Style',
      difficulty: 'easy',
      topic: 'basics',
      language_info: {
        name: 'python',
        version: '3.10.0',
        mimetype: 'text/x-python',
        file_extension: '.py',
      },
    },
    cells: [
      {
        id: crypto.randomUUID(),
        cell_type: 'markdown',
        source: [
          '# Hello World - Notebook Style\n',
          '\n',
          'Welcome to your first Jupyter notebook exercise!\n',
          '\n',
          'Instructions:\n',
          '1. Read through this markdown cell\n',
          '2. Run the code cell below\n',
          '3. See the output preserved\n',
        ],
        metadata: {},
      },
      {
        id: crypto.randomUUID(),
        cell_type: 'code',
        source: [
          '# Your first Python code\n',
          'print("Hello from Notebook Labs!")\n',
          '\n',
          '# Try modifying this and running again!\n',
          'name = "Learner"\n',
          'print(f"Welcome, {name}!")\n',
        ],
        execution_count: null,
        outputs: [],
        metadata: {},
      },
      {
        id: crypto.randomUUID(),
        cell_type: 'markdown',
        source: [
          '## What just happened?\n',
          '\n',
          'When you ran the code cell:\n',
          '- The Python code executed\n',
          '- The output was captured\n',
          '- It displayed below the cell\n',
          '\n',
          'You can run cells as many times as you want!\n',
        ],
        metadata: {},
      },
    ],
  };
}
