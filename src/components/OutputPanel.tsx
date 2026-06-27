import { cn } from '@/lib/utils';
import type { TestResults, IndividualTestResult } from '@/lib/sandbox.types';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface OutputPanelProps {
  output: string[];
  testResults: TestResults | null;
  isRunning: boolean;
  className?: string;
}

export function OutputPanel({ output, testResults, isRunning, className }: OutputPanelProps) {
  const hasTests = testResults && testResults.results.length > 0;

  return (
    <div className={cn('h-full flex flex-col bg-slate-950 font-mono text-sm', className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900">
        <h3 className="font-semibold text-slate-200">Output</h3>
        {isRunning && (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Running...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Console Output */}
        {output.length > 0 && (
          <div className="space-y-1">
            {output.map((line, i) => (
              <div key={i} className="text-slate-300 whitespace-pre-wrap">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Test Results */}
        {hasTests && (
          <div className="space-y-2">
            <div className={cn(
              'flex items-center gap-2 font-semibold',
              testResults.passed ? 'text-green-400' : 'text-amber-400'
            )}>
              {testResults.passed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span>
                {testResults.passed ? 'All tests passed!' : 'Some tests failed'}
              </span>
              <span className="text-slate-500 text-xs ml-2">
                ({testResults.results.filter(r => r.passed).length}/{testResults.results.length})
              </span>
              {testResults.execution_time_ms && (
                <span className="text-slate-500 text-xs ml-auto">
                  {testResults.execution_time_ms}ms
                </span>
              )}
            </div>

            <div className="space-y-1">
              {testResults.results.map((result, i) => (
                <TestCaseResult key={i} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* Execution Error */}
        {testResults?.error && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/50 rounded text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">Execution Error</div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{testResults.error}</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isRunning && output.length === 0 && !hasTests && (
          <div className="text-slate-600 text-center py-8">
            Run your code to see output here
          </div>
        )}
      </div>
    </div>
  );
}

interface TestCaseResultProps {
  result: IndividualTestResult;
}

function TestCaseResult({ result }: TestCaseResultProps) {
  return (
    <div className={cn(
      'p-3 rounded border',
      result.passed
        ? 'bg-green-950/20 border-green-900/50'
        : 'bg-amber-950/20 border-amber-900/50'
    )}>
      <div className="flex items-center gap-2">
        {result.passed ? (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        ) : (
          <XCircle className="h-4 w-4 text-amber-400" />
        )}
        <span className="font-medium text-slate-200">
          {result.description || 'Test case'}
        </span>
      </div>

      {!result.passed && (
        <div className="mt-2 space-y-1 text-xs">
          {result.error ? (
            <div className="text-red-400 whitespace-pre-wrap">{result.error}</div>
          ) : (
            <>
              {result.input && (
                <div className="text-slate-400">
                  <span className="text-slate-500">Input:</span> {result.input}
                </div>
              )}
              <div className="flex gap-4">
                <div className="text-green-400">
                  <span className="text-slate-500">Expected:</span> {result.expected}
                </div>
                <div className="text-amber-400">
                  <span className="text-slate-500">Actual:</span> {result.actual}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
