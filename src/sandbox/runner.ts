// Main-thread side of the sandbox (SPEC 4.2, 4.5). Owns one worker per language, judges results
// with compare.ts, and runs the watchdog that terminates a worker stuck in user code.
import type { Challenge, Language } from '../content/schema';
import { judge, pendingResults } from './compare';
import type { ErrorInfo, FromWorker, RunRequest, RunSummary, TestResult, TestStatus } from './protocol';

export type { RunSummary, TestResult, TestStatus } from './protocol';

export type RunnerState = 'idle' | 'loading' | 'ready' | 'error';
export interface RunnerStatus {
  state: RunnerState;
  progress: number; // 0 to 1 while loading
  error?: string; // set when state is 'error'
}

export interface Runner {
  readonly language: Language;
  warm(): Promise<void>;
  run(code: string, challenge: Challenge, onUpdate: (r: TestResult[]) => void): Promise<RunSummary>;
  dispose(): void;
  // Extensions for the UI: load status for the "Loading Python" state and the Retry button.
  getStatus(): RunnerStatus;
  subscribe(listener: () => void): () => void;
}

export const DEFAULT_TIMEOUT_MS: Record<Language, number> = { python: 4000, typescript: 2000 };
const LOAD_TIMEOUT_MS: Record<Language, number> = { python: 30000, typescript: 10000 };

function spawnWorker(language: Language): Worker {
  return language === 'python'
    ? new Worker(new URL('./workers/python.worker.ts', import.meta.url), { type: 'module' })
    : new Worker(new URL('./workers/js.worker.ts', import.meta.url), { type: 'module' });
}

interface ActiveRun {
  runId: number;
  challenge: Challenge;
  results: TestResult[];
  current: number; // index of the running test, -1 while compiling
  timeoutMs: number;
  timer?: ReturnType<typeof setTimeout>;
  onUpdate: (r: TestResult[]) => void;
  resolve: (s: RunSummary) => void;
}

export function createRunner(language: Language): Runner {
  let worker: Worker | null = null;
  let ready: Promise<void> | null = null;
  let status: RunnerStatus = { state: 'idle', progress: 0 };
  let active: ActiveRun | null = null;
  let nextRunId = 0;
  let disposed = false;
  const listeners = new Set<() => void>();

  const setStatus = (s: RunnerStatus) => {
    status = s;
    listeners.forEach((l) => l());
  };

  function spawn(): Promise<void> {
    const w = spawnWorker(language);
    worker = w;
    setStatus({ state: 'loading', progress: 0 });
    let isReady = false;

    const promise = new Promise<void>((resolve, reject) => {
      const fail = (msg: string) => {
        clearTimeout(loadTimer);
        w.terminate();
        if (worker === w) {
          worker = null;
          ready = null;
          setStatus({ state: 'error', progress: 0, error: msg });
        }
        reject(new Error(msg));
      };
      const loadTimer = setTimeout(
        () => fail(`${language === 'python' ? 'Python' : 'JS / TS'} took more than ${LOAD_TIMEOUT_MS[language] / 1000} seconds to load.`),
        LOAD_TIMEOUT_MS[language],
      );

      w.onmessage = (ev: MessageEvent<FromWorker>) => {
        const m = ev.data;
        if (m.type === 'ready') {
          clearTimeout(loadTimer);
          isReady = true;
          if (worker === w) setStatus({ state: 'ready', progress: 1 });
          resolve();
        } else if (m.type === 'progress') {
          if (worker === w && !isReady) setStatus({ state: 'loading', progress: m.fraction });
        } else if (m.type === 'load-error') {
          fail(m.message);
        } else if (worker === w) {
          onRunMessage(m);
        }
      };
      w.onerror = (ev: ErrorEvent) => {
        ev.preventDefault();
        if (!isReady) fail(ev.message || 'The code runner failed to start.');
        else if (worker === w) abort('error', { message: `The runtime crashed (${ev.message || 'unknown error'}). It is restarting.` });
      };
    });
    promise.catch(() => {}); // callers that care await warm()
    ready = promise;
    return promise;
  }

  function warm(): Promise<void> {
    if (disposed) return Promise.reject(new Error('Runner disposed'));
    return ready ?? spawn();
  }

  const emit = (run: ActiveRun) => run.onUpdate(run.results.slice());

  function startTimer(run: ActiveRun) {
    clearTimeout(run.timer);
    run.timer = setTimeout(() => {
      if (active === run) {
        abort('timeout', {
          message: `Stopped after ${run.timeoutMs / 1000} seconds. Look for a loop that never ends.`,
        });
      }
    }, run.timeoutMs);
  }

  function finish(run: ActiveRun, compileError?: ErrorInfo) {
    clearTimeout(run.timer);
    if (active === run) active = null;
    emit(run);
    run.resolve({
      results: run.results.slice(),
      compileError,
      passed: run.results.filter((r) => r.status === 'pass').length,
      total: run.results.length,
    });
  }

  const skipRest = (run: ActiveRun, from: number) => {
    for (let i = from; i < run.results.length; i++) {
      const r = run.results[i];
      if (r.status === 'pending' || r.status === 'running') run.results[i] = { ...r, status: 'skipped' };
    }
  };

  /** Kill the worker mid-run: mark the current test, skip the rest, respawn in the background. */
  function abort(kind: Extract<TestStatus, 'timeout' | 'error'>, error: ErrorInfo) {
    const run = active;
    worker?.terminate();
    worker = null;
    ready = null;
    if (run) {
      const i = Math.max(run.current, 0);
      const r = run.results[i];
      if (r) run.results[i] = { ...r, status: kind, error, ms: kind === 'timeout' ? run.timeoutMs : r.ms };
      skipRest(run, i + 1);
      finish(run);
    }
    if (!disposed) void spawn().catch(() => {});
  }

  function onRunMessage(m: FromWorker) {
    const run = active;
    if (!run || !('runId' in m) || m.runId !== run.runId) return;
    switch (m.type) {
      case 'test-start':
        run.current = m.index;
        run.results[m.index] = { ...run.results[m.index], status: 'running' };
        startTimer(run);
        emit(run);
        break;
      case 'test-end':
        clearTimeout(run.timer);
        run.results[m.index] = judge(run.challenge.tests[m.index], m, run.challenge.compare);
        emit(run);
        break;
      case 'compile-error':
        skipRest(run, 0);
        finish(run, { message: m.message, line: m.line });
        break;
      case 'crash':
        abort('error', { message: `The runtime hit an internal error (${m.message}). It is restarting.` });
        break;
      case 'done':
        finish(run);
        break;
    }
  }

  async function run(code: string, challenge: Challenge, onUpdate: (r: TestResult[]) => void): Promise<RunSummary> {
    if (active) throw new Error('A run is already in progress.');
    await warm();
    const w = worker;
    if (!w) throw new Error('The code runner is not available.');
    const runId = ++nextRunId;
    const req: RunRequest = {
      type: 'run',
      runId,
      code,
      entry: challenge.entry[language],
      params: challenge.params,
      returns: challenge.returns,
      tests: challenge.tests,
    };
    return new Promise<RunSummary>((resolve) => {
      const r: ActiveRun = {
        runId,
        challenge,
        results: pendingResults(challenge.tests),
        current: -1,
        timeoutMs: challenge.timeoutMs ?? DEFAULT_TIMEOUT_MS[language],
        onUpdate,
        resolve,
      };
      active = r;
      emit(r);
      startTimer(r); // also guards top-level code that never finishes
      w.postMessage(req);
    });
  }

  function dispose() {
    disposed = true;
    if (active) {
      skipRest(active, 0);
      finish(active);
    }
    worker?.terminate();
    worker = null;
    ready = null;
    listeners.clear();
  }

  return {
    language,
    warm,
    run,
    dispose,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// One runner per language for the whole visit, so Pyodide loads once even if the
// sandbox remounts when the lesson changes.
const shared: Partial<Record<Language, Runner>> = {};
export function getRunner(language: Language): Runner {
  return (shared[language] ??= createRunner(language));
}
