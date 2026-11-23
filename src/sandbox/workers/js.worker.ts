// JS / TS worker: Sucrase is bundled in, so it is ready as soon as the module loads.
import type { FromWorker, ToWorker } from '../protocol';
import { runJs } from '../harness/js';

const post = (msg: FromWorker) => (self as unknown as { postMessage(m: FromWorker): void }).postMessage(msg);

self.onmessage = (ev: MessageEvent<ToWorker>) => {
  const req = ev.data;
  try {
    runJs(req, post);
  } catch (e) {
    post({ type: 'crash', runId: req.runId, message: e instanceof Error ? e.message : String(e) });
  }
};

post({ type: 'progress', fraction: 1 });
post({ type: 'ready' });
