// stack (SPEC 3.3): a pile on one tile, bottom first. Each item is 1.5 units tall, stacked along z,
// with its value sheared onto the right face. A "top" marker floats above the pile.
import type { StackStructure } from '../../content/schema';
import type { LayoutResult } from '../types';
import { cellId, empty, MARKER_GAP, normCell, toneBlock } from './common';

export const ITEM_H = 1.5;

export function layoutStack(s: StackStructure): LayoutResult {
  const out = empty();
  s.items.forEach((item, i) => {
    const c = normCell(item);
    out.blocks.push(
      toneBlock({ key: cellId(item, i), x: 0, y: 0, z: i * ITEM_H, h: ITEM_H, text: String(c.value), textOn: 'side', sub: c.sub, tone: c.tone }, { lift: false }),
    );
  });
  out.zones.push({ key: '#plate', x: -0.2, y: -0.2, w: 1.4, d: 1.4, tone: 'idle', style: 'plate' });
  out.markers.push({ key: '@top', x: 0.5, y: 0.5, z: s.items.length * ITEM_H + MARKER_GAP, text: 'top', tone: 'active', for: s.items.length ? cellId(s.items[s.items.length - 1], s.items.length - 1) : undefined });
  if (s.label) out.labels.push({ key: '#title', x: 0.5, y: 1.25, text: s.label, kind: 'title', place: 'below' });
  return out;
}

export default layoutStack;
