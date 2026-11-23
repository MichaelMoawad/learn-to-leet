// Messages between runner.ts (main thread) and the language workers (SPEC 4.2).
import type { Challenge, Json, TestCase, ValueType } from '../content/schema';

export interface RunRequest {
  type: 'run';
  runId: number;
  code: string;
  entry: string;
  params: Challenge['params'];
  returns: ValueType;
  tests: TestCase[];
}

export type ToWorker = RunRequest;

export interface ErrorInfo {
  message: string;
  line?: number;
}

export type FromWorker =
  | { type: 'ready' }
  // Extensions to SPEC 4.2: load progress (0 to 1) and load failure, for the "Loading Python" state.
  | { type: 'progress'; fraction: number }
  | { type: 'load-error'; message: string }
  // The runtime itself broke (not the user's code throwing). The runner replaces the worker.
  | { type: 'crash'; runId: number; message: string }
  | { type: 'compile-error'; runId: number; message: string; line?: number }
  | { type: 'test-start'; runId: number; index: number }
  | { type: 'test-end'; runId: number; index: number; ok: true; actualJson: string; stdout: string; ms: number }
  | { type: 'test-end'; runId: number; index: number; ok: false; error: ErrorInfo; stdout: string; ms: number }
  | { type: 'done'; runId: number };

export type TestEndMessage = Extract<FromWorker, { type: 'test-end' }>;
export type Emit = (msg: FromWorker) => void;

export type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'error' | 'timeout' | 'skipped';

export interface TestResult {
  name: string;
  status: TestStatus;
  actual?: Json;
  expected: Json;
  stdout: string;
  error?: ErrorInfo;
  ms?: number;
}

export interface RunSummary {
  results: TestResult[];
  compileError?: ErrorInfo;
  passed: number;
  total: number;
}

/** stdout is capped at 10 KB per test in both languages (SPEC 4.4). */
export const STDOUT_LIMIT = 10 * 1024;
export const STDOUT_TRUNCATED = '\n[output truncated at 10 KB]';
