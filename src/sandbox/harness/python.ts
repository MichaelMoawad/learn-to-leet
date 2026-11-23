// Python harness (SPEC 4.4). Shared by workers/python.worker.ts and scripts/check-content.ts:
// both hand in a loaded Pyodide and a callback that receives protocol messages.
import type { Emit, ErrorInfo, RunRequest } from '../protocol';
import { STDOUT_LIMIT, STDOUT_TRUNCATED } from '../protocol';
import { HARNESS_PY, PRELUDE_PY } from './prelude.py.ts';

type PyCallable = ((...args: unknown[]) => unknown) & { destroy?: () => void };

/** The slice of PyodideInterface the harness needs. */
export interface PyRuntime {
  runPython(code: string): unknown;
  globals: { get(name: string): unknown; set(name: string, value: unknown): void };
}

const prepared = new WeakMap<PyRuntime, { compile: PyCallable; test: PyCallable }>();

/** Load the driver into the interpreter. Safe to call more than once. */
export function preparePython(py: PyRuntime): void {
  if (prepared.has(py)) return;
  py.globals.set('_LTL_PRELUDE', PRELUDE_PY);
  py.globals.set('_LTL_STDOUT_LIMIT', STDOUT_LIMIT);
  py.globals.set('_LTL_STDOUT_TRUNCATED', STDOUT_TRUNCATED);
  py.runPython(HARNESS_PY);
  prepared.set(py, {
    compile: py.globals.get('_ltl_compile') as PyCallable,
    test: py.globals.get('_ltl_test') as PyCallable,
  });
}

type TestOut =
  | { ok: true; actualJson: string; stdout: string; ms: number }
  | { ok: false; error: ErrorInfo; stdout: string; ms: number };

/** Run every test synchronously, emitting protocol messages as it goes. */
export function runPython(py: PyRuntime, req: RunRequest, emit: Emit): void {
  preparePython(py);
  const { compile, test } = prepared.get(py)!;
  const { runId } = req;

  const compileError = String(compile(req.code, req.entry));
  if (compileError) {
    const err = JSON.parse(compileError) as ErrorInfo;
    emit({ type: 'compile-error', runId, message: err.message, line: err.line });
    return;
  }

  const kinds = JSON.stringify(req.params.map((p) => p.type));
  req.tests.forEach((t, index) => {
    emit({ type: 'test-start', runId, index });
    const out = JSON.parse(String(test(JSON.stringify(t.args), kinds, req.returns))) as TestOut;
    const ms = Math.round(out.ms * 100) / 100;
    if (out.ok) emit({ type: 'test-end', runId, index, ok: true, actualJson: out.actualJson, stdout: out.stdout, ms });
    else emit({ type: 'test-end', runId, index, ok: false, error: out.error, stdout: out.stdout, ms });
  });
  emit({ type: 'done', runId });
}
