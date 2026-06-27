import { cn } from '@/lib/utils';
import type { TestCase, TestResults } from '@/lib/sandbox.types';
import { CheckCircle2, XCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestCasesProps {
  testCases: TestCase[];
  testResults: TestResults | null;
  isRunning: boolean;
  onRunTests: () => void;
  className?: string;
}

export function TestCases({
  testCases,
  testResults,
  isRunning,
  onRunTests,
  className,
}: TestCasesProps) {
  const hasPassedTests = testResults?.results.some(r => r.passed);
  const hasFailedTests = testResults?.results.some(r => !r.passed);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-700">Test Cases</h3>
        <div className="flex items-center gap-2">
          {hasPassedTests && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {testResults?.results.filter(r => r.passed).length} passed
            </span>
          )}
          {hasFailedTests && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <XCircle className="h-3 w-3" />
              {testResults?.results.filter(r => !r.passed).length} failed
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {testCases.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-4">
            No test cases for this exercise
          </div>
        ) : (
          testCases.map((testCase, i) => {
            const result = testResults?.results[i];
            const status = result ? (result.passed ? 'passed' : 'failed') : 'pending';

            return (
              <TestCaseItem
                key={i}
                index={i}
                testCase={testCase}
                status={status}
              />
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <Button
          onClick={onRunTests}
          disabled={isRunning || testCases.length === 0}
          className="w-full"
          size="sm"
        >
          {isRunning ? (
            <>Running...</>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface TestCaseItemProps {
  index: number;
  testCase: TestCase;
  status: 'pending' | 'passed' | 'failed';
}

function TestCaseItem({ index, testCase, status }: TestCaseItemProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        status === 'passed' && 'bg-green-50 border-green-200',
        status === 'failed' && 'bg-amber-50 border-amber-200',
        status === 'pending' && 'bg-slate-50 border-slate-200'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold',
              status === 'passed' && 'bg-green-500 text-white',
              status === 'failed' && 'bg-amber-500 text-white',
              status === 'pending' && 'bg-slate-300 text-slate-600'
            )}>
              {index + 1}
            </span>
            <span className="font-medium text-slate-700 text-sm">
              {testCase.description || `Test Case ${index + 1}`}
            </span>
          </div>

          {testCase.input && (
            <div className="mt-2 text-xs font-mono bg-slate-100 rounded p-2">
              <span className="text-slate-500">Input:</span>
              <pre className="mt-1 whitespace-pre-wrap text-slate-700">{testCase.input}</pre>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          {status === 'passed' && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          {status === 'failed' && (
            <XCircle className="h-5 w-5 text-amber-500" />
          )}
          {status === 'pending' && (
            <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
          )}
        </div>
      </div>

      {testCase.expected_output && (
        <div className="mt-2 text-xs">
          <span className="text-slate-500">Expected: </span>
          <span className="font-mono text-slate-700">{testCase.expected_output}</span>
        </div>
      )}
    </div>
  );
}
