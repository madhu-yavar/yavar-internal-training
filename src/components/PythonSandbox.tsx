import { useState, useEffect, useCallback, useRef } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { CodeEditor } from '@/components/CodeEditor';
import { OutputPanel } from '@/components/OutputPanel';
import { TestCases } from '@/components/TestCases';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Save, Loader2, Lightbulb } from 'lucide-react';
import type { TestCase, TestResults, IndividualTestResult } from '@/lib/sandbox.types';
import { cn } from '@/lib/utils';

// Pyodide global type
declare global {
  interface Window {
    loadPyodide: () => Promise<any>;
  }
}

interface PythonSandboxProps {
  starterCode: string;
  testCases: TestCase[];
  onRun?: () => void;
  onSave?: (code: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function PythonSandbox({
  starterCode,
  testCases,
  onRun,
  onSave,
  readOnly = false,
  className,
}: PythonSandboxProps) {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [pyodideLoading, setPyodideLoading] = useState(true);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const pyodideRef = useRef<any>(null);

  // Load Pyodide from CDN
  useEffect(() => {
    let mounted = true;

    async function loadPyodide() {
      try {
        if (!window.loadPyodide) {
          // Load Pyodide script
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
          script.async = true;
          document.head.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        if (mounted) {
          pyodideRef.current = await window.loadPyodide();
          setPyodideReady(true);
          setPyodideLoading(false);
        }
      } catch (error) {
        console.error('Failed to load Pyodide:', error);
        if (mounted) {
          setPyodideLoading(false);
        }
      }
    }

    loadPyodide();

    return () => {
      mounted = false;
    };
  }, []);

  // Capture stdout from Python
  const setupStdoutCapture = useCallback((pyodide: any) => {
    pyodide.runPython(`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self):
        self.outputs = []

    def write(self, text):
        self.outputs.append(str(text))

    def flush(self):
        pass

    def get_outputs(self):
        return self.outputs

_stdout_capture = OutputCapture()
sys.stdout = _stdout_capture
sys.stderr = _stdout_capture
    `);
  }, []);

  // Run code in Pyodide
  const runCode = useCallback(async () => {
    if (!pyodideReady || !pyodideRef.current) {
      return;
    }

    setIsRunning(true);
    setOutput([]);
    setTestResults(null);

    try {
      const pyodide = pyodideRef.current;

      // Setup output capture
      setupStdoutCapture(pyodide);

      const startTime = performance.now();

      // Run user code
      await pyodide.runPythonAsync(code);

      // Capture output
      const outputs = pyodide.runPython('_stdout_capture.get_outputs()');
      setOutput(outputs.filter((o: string) => o.trim()).map((o: string) => o.trim()));

      const executionTime = Math.round(performance.now() - startTime);
    } catch (error) {
      setOutput([`Error: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setIsRunning(false);
      onRun?.();
    }
  }, [code, pyodideReady, onRun, setupStdoutCapture]);

  // Run test cases
  const runTests = useCallback(async () => {
    if (!pyodideReady || !pyodideRef.current || testCases.length === 0) {
      return;
    }

    setIsRunning(true);
    setTestResults(null);

    try {
      const pyodide = pyodideRef.current;
      const results: IndividualTestResult[] = [];
      let allPassed = true;
      const startTime = performance.now();

      for (const testCase of testCases) {
        try {
          // Reset stdout capture
          setupStdoutCapture(pyodide);

          // Run user code first
          await pyodide.runPythonAsync(code);

          // Run test input and capture result
          let actualOutput = '';
          if (testCase.input) {
            await pyodide.runPythonAsync(testCase.input);
            const outputs = pyodide.runPython('_stdout_capture.get_outputs()');
            actualOutput = outputs.join('').trim();
          } else {
            // For print statements, capture what was printed
            const outputs = pyodide.runPython('_stdout_capture.get_outputs()');
            actualOutput = outputs.join('').trim();
          }

          const passed = actualOutput === testCase.expected_output;

          results.push({
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: actualOutput,
            passed,
          });

          if (!passed) {
            allPassed = false;
          }
        } catch (error) {
          results.push({
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: '',
            passed: false,
            error: error instanceof Error ? error.message : String(error),
          });
          allPassed = false;
        }
      }

      const executionTime = Math.round(performance.now() - startTime);

      setTestResults({
        passed: allPassed,
        results,
        execution_time_ms: executionTime,
      });
    } catch (error) {
      setTestResults({
        passed: false,
        results: [],
        execution_time_ms: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRunning(false);
      onRun?.();
    }
  }, [code, testCases, pyodideReady, onRun, setupStdoutCapture]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.(code);
  }, [code, onSave]);

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Loading State */}
      {pyodideLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading Python environment...</p>
          </div>
        </div>
      )}

      {/* Main Editor */}
      {!pyodideLoading && (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Code Editor Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">Python</span>
                  {!pyodideReady && (
                    <span className="text-xs text-amber-600">Initializing...</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!readOnly && onSave && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      disabled={isRunning}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={runCode}
                    disabled={isRunning || !pyodideReady}
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Run
                  </Button>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1">
                <CodeEditor
                  value={code}
                  onChange={(value) => setCode(value ?? '')}
                  readOnly={readOnly}
                  height="100%"
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <Tabs defaultValue="output" className="h-full">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
                <TabsList className="bg-transparent border-0 h-auto p-0">
                  <TabsTrigger value="output" className="data-[state=active]:bg-slate-100">
                    Output
                  </TabsTrigger>
                  <TabsTrigger value="tests" className="data-[state=active]:bg-slate-100">
                    Test Cases ({testCases.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="output" className="h-[calc(100%-44px)] p-0 m-0">
                <OutputPanel
                  output={output}
                  testResults={testResults}
                  isRunning={isRunning}
                />
              </TabsContent>

              <TabsContent value="tests" className="h-[calc(100%-44px)] p-0 m-0">
                <TestCases
                  testCases={testCases}
                  testResults={testResults}
                  isRunning={isRunning}
                  onRunTests={runTests}
                />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
