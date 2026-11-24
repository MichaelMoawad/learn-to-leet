// queue (SPEC 3.3): a row along x like an array, front first, with "front" and "back" floor labels
// at the two ends. Give items ids so they slide forward when the front is dequeued.
import type { QueueStructure } from '../../content/schema';
import type { LayoutResult } from '../types';
import { rowBlocks } from './array';
import { empty } from './common';

export function layoutQueue(s: QueueStructure): LayoutResult {
  const out = empty();
  out.blocks = rowBlocks(s.items);
  const n = s.items.length;
  out.labels.push({ key: '#front', x: -0.55, y: 0.5, text: 'front', kind: 'note' });
  out.labels.push({ key: '#back', x: Math.max(n, 1) + 0.55, y: 0.5, text: 'back', kind: 'note' });
  out.zones.push({ key: '#lane', x: -0.15, y: -0.15, w: Math.max(n, 1) + 0.3, d: 1.3, tone: 'idle', style: 'plate' });
  if (s.label) out.labels.push({ key: '#title', x: 0.3, y: 1.3, text: s.label, kind: 'title', place: 'below', align: 'end' });
  return out;
}

export default layoutQueue;
