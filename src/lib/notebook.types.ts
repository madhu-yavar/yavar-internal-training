/**
 * Jupyter Notebook Type Definitions
 * Based on Jupyter Notebook format specification (nbformat v4)
 */

export interface NotebookFormat {
  nbformat: 4;
  nbformat_minor: number;
  metadata: NotebookMetadata;
  cells: NotebookCell[];
}

export interface NotebookMetadata {
  /** Kernel information */
  kernelspec?: KernelSpec;
  /** Language kernel name */
  language_info?: LanguageInfo;
  /** Custom metadata for our platform */
  exercise_id?: string;
  difficulty?: string;
  topic?: string;
  title?: string;
  [key: string]: unknown;
}

export interface KernelSpec {
  name: string;
  display_name: string;
  language: string;
}

export interface LanguageInfo {
  name: string;
  version: string;
  mimetype: string;
  file_extension: string;
  pygments_lexer?: string;
  codemirror_mode?: string | { name: string };
}

export type NotebookCell = MarkdownCell | CodeCell;

export interface BaseCell {
  id: string;
  cell_type: 'markdown' | 'code';
  metadata: Record<string, unknown>;
  source: string | string[];
}

export interface MarkdownCell extends BaseCell {
  cell_type: 'markdown';
  attachments?: Record<string, unknown>;
}

export interface CodeCell extends BaseCell {
  cell_type: 'code';
  execution_count: number | null;
  outputs: CellOutput[];
}

export type CellOutput =
  | StreamOutput
  | ErrorOutput
  | ExecuteResultOutput
  | DisplayDataOutput;

export interface StreamOutput {
  output_type: 'stream';
  name: 'stdout' | 'stderr';
  text: string | string[];
}

export interface ErrorOutput {
  output_type: 'error';
  ename: string;
  evalue: string;
  traceback: string[];
}

export interface ExecuteResultOutput {
  output_type: 'execute_result';
  execution_count?: number;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface DisplayDataOutput {
  output_type: 'display_data';
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// UI State Types
export interface NotebookState {
  cells: NotebookUICell[];
  selectedCellId: string | null;
  isRunning: boolean;
  isSaving: boolean;
}

export interface NotebookUICell {
  id: string;
  type: 'markdown' | 'code';
  content: string;
  outputs: CellOutput[];
  executionCount: number | null;
  isRunning: boolean;
  isExpanded: boolean;
}

// Exercise Types
export interface NotebookExercise {
  id: string;
  title: string;
  description: string;
  notebook_content: NotebookFormat;
  solution_notebook: NotebookFormat | null;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string | null;
  estimated_minutes: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotebookAttempt {
  id: string;
  user_id: string;
  exercise_id: string;
  notebook_state: NotebookFormat;
  passed: boolean;
  attempted_at: string;
}
