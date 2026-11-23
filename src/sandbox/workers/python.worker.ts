// Python worker: loads Pyodide from the CDN (kept out of the bundle) and runs the shared harness.
import type { FromWorker, ToWorker } from '../protocol';
import { preparePython, runPython, type PyRuntime } from '../harness/python';
import { PYODIDE_URL } from './pyodideUrl';

type PyodideModule = typeof import('pyodide');

const post = (msg: FromWorker) => (self as unknown as { postMessage(m: FromWorker): void }).postMessage(msg);

async function load(): Promise<PyRuntime | null> {
  try {
    post({ type: 'progress', fraction: 0.05 });
    const mod = (await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`)) as PyodideModule;
    post({ type: 'progress', fraction: 0.2 });
    const py = await mod.loadPyodide({ indexURL: PYODIDE_URL, stdout: () => {}, stderr: () => {} });
    post({ type: 'progress', fraction: 0.9 });
    preparePython(py as unknown as PyRuntime);
    post({ type: 'progress', fraction: 1 });
    post({ type: 'ready' });
    return py as unknown as PyRuntime;
  } catch (e) {
    post({ type: 'load-error', message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

const runtime = load();

self.onmessage = async (ev: MessageEvent<ToWorker>) => {
  const req = ev.data;
  const py = await runtime;
  if (!py) {
    post({ type: 'crash', runId: req.runId, message: 'Python is not loaded.' });
    return;
  }
  try {
    runPython(py, req, post);
  } catch (e) {
    post({ type: 'crash', runId: req.runId, message: e instanceof Error ? e.message : String(e) });
  }
};
