/**
 * Python Sandbox Type Definitions
 */

export interface SandboxExercise {
  id: string;
  title: string;
  description: string;
  instructions: string | null;
  starter_code: string;
  solution_code: string | null;
  test_cases: TestCase[];
  hints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string | null;
  estimated_minutes: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  description?: string;
  input: string;
  expected_output: string;
}

export interface SandboxAttempt {
  id: string;
  user_id: string;
  exercise_id: string;
  code_submitted: string;
  test_results: TestResults | null;
  ai_review: AIReview | null;
  passed: boolean;
  attempted_at: string;
}

export interface TestResults {
  passed: boolean;
  results: IndividualTestResult[];
  execution_time_ms: number;
  error?: string;
}

export interface IndividualTestResult {
  description?: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

export interface AIReview {
  summary: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  best_practices: string[];
}

export interface SandboxState {
  code: string;
  output: string[];
  isRunning: boolean;
  testResults: TestResults | null;
  aiReview: AIReview | null;
  isPyodideLoading: boolean;
  pyodideReady: boolean;
}

export interface AICodeReviewRequest {
  code: string;
  exerciseContext: string;
  testResults: IndividualTestResult[];
}
