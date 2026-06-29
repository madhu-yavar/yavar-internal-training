/**
 * Shared Pyodide Kernel Hook
 * Manages singleton Pyodide instance across Monaco and Notebook interfaces
 */
import { useState, useEffect, useRef, useCallback } from 'react';

// Global Pyodide instance
let globalPyodide: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;
const listeners = new Set<(pyodide: any | null) => void>();

interface PyodideKernelState {
  pyodide: any | null;
  isLoading: boolean;
  error: Error | null;
  isReady: boolean;
}

/**
 * Load Pyodide from CDN
 */
async function loadPyodideInstance(): Promise<any> {
  if (globalPyodide) {
    return globalPyodide;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      // Load Pyodide script
      if (!(window as any).loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
          script.async = true;
          document.head.appendChild(script);

          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Pyodide script'));
        });
      }

      // Initialize Pyodide
      const pyodide = await (window as any).loadPyodide();

      // Setup stdout/stderr capture
      await pyodide.runPythonAsync(`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self):
        self.outputs = []

    def write(self, text):
        if text.strip():
            self.outputs.append(text)

    def flush(self):
        pass

    def get_outputs(self):
        return self.outputs

    def clear(self):
        self.outputs = []

_stdout_capture = OutputCapture()
_stderr_capture = OutputCapture()
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture
      `);

      // Preload common data science packages
      // These are used in the sample notebooks
      console.log('Loading Python packages...');
      try {
        await pyodide.loadPackage(['numpy', 'pandas']);
        console.log('✓ NumPy and Pandas loaded');

        // Load matplotlib (for plotting notebooks)
        await pyodide.loadPackage('matplotlib');
        console.log('✓ Matplotlib loaded');

        // Setup matplotlib for browser environment (non-interactive backend)
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('module://matplotlib.backends.backend_svg')
import matplotlib.pyplot as plt
        `);
        console.log('✓ Matplotlib configured for browser');

        // Load scikit-learn (for ML notebook)
        await pyodide.loadPackage('scikit-learn');
        console.log('✓ Scikit-learn loaded');
      } catch (error) {
        console.warn('Some packages failed to load:', error);
      }

      globalPyodide = pyodide;
      isLoading = false;
      loadPromise = null;

      // Notify all listeners
      listeners.forEach(listener => listener(pyodide));

      return pyodide;
    } catch (error) {
      isLoading = false;
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Hook to use the shared Pyodide kernel
 */
export function usePyodideKernel() {
  const [state, setState] = useState<PyodideKernelState>({
    pyodide: globalPyodide,
    isLoading: isLoading || (!globalPyodide && !loadPromise),
    error: null,
    isReady: !!globalPyodide,
  });

  const listenerRef = useRef<(pyodide: any | null) => void>();

  useEffect(() => {
    // If already loaded, set it immediately
    if (globalPyodide) {
      setState({
        pyodide: globalPyodide,
        isLoading: false,
        error: null,
        isReady: true,
      });
      return;
    }

    // Set up listener
    listenerRef.current = (pyodide: any | null) => {
      setState({
        pyodide,
        isLoading: false,
        error: null,
        isReady: !!pyodide,
      });
    };

    listeners.add(listenerRef.current);

    // Start loading if not already loading
    if (!isLoading && !loadPromise) {
      isLoading = true;
      setState(prev => ({ ...prev, isLoading: true }));

      loadPyodideInstance().catch((error: Error) => {
        setState({
          pyodide: null,
          isLoading: false,
          error,
          isReady: false,
        });
      });
    }

    return () => {
      if (listenerRef.current) {
        listeners.delete(listenerRef.current);
      }
    };
  }, []);

  /**
   * Run Python code
   */
  const runPython = useCallback(async (code: string): Promise<{ output: string[]; error: string | null }> => {
    if (!state.pyodide || !state.isReady) {
      throw new Error('Pyodide not ready');
    }

    try {
      // Clear previous outputs
      await state.pyodide.runPythonAsync(`
_stdout_capture.clear()
_stderr_capture.clear()
      `);

      // Run user code
      await state.pyodide.runPythonAsync(code);

      // Get outputs
      const outputs = state.pyodide.runPython('_stdout_capture.get_outputs() + _stderr_capture.get_outputs()');

      return {
        output: outputs || [],
        error: null,
      };
    } catch (error) {
      return {
        output: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [state.pyodide, state.isReady]);

  /**
   * Reset the kernel state
   */
  const reset = useCallback(async () => {
    if (!state.pyodide || !state.isReady) {
      return;
    }

    // Reload Python environment
    await state.pyodide.runPythonAsync(`
import sys
from io import StringIO

_stdout_capture = OutputCapture()
_stderr_capture = OutputCapture()
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture
    `);
  }, [state.pyodide, state.isReady]);

  return {
    ...state,
    runPython,
    reset,
  };
}

/**
 * Get Pyodide instance without React hook (for server-side or non-component use)
 */
export async function getPyodideInstance(): Promise<any> {
  return loadPyodideInstance();
}

/**
 * Reset global Pyodide instance (useful for testing or cleanup)
 */
export function resetGlobalPyodide(): void {
  globalPyodide = null;
  isLoading = false;
  loadPromise = null;
  listeners.clear();
}
