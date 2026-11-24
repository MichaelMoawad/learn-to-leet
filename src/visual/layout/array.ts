// array (SPEC 3.3): cells along x at y = 0, index labels on the floor in front, pointer markers
// above, `window` as a floor bracket, `bars` heights from values. Strings are arrays of characters.
import type { ArrayStructure } from '../../content/schema';
import type { BlockSpec, LayoutResult } from '../types';
import { cellId, DEFAULT_H, empty, normCell, pointerMarkers, toneBlock } from './common';

/** Shared by array and queue: blocks for a row of cells along x. */
export function rowBlocks(cells: ArrayStructure['cells'], variant: ArrayStructure['variant'] = 'cells'): BlockSpec[] {
  const norm = cells.map(normCell);
  const nums = norm.map((c) => (typeof c.value === 'number' ? Math.abs(c.value) : NaN));
  const max = Math.max(0, ...nums.filter((n) => !Number.isNaN(n)));
  return norm.map((c, i) => {
    let h = c.h ?? DEFAULT_H;
    if (variant === 'bars') {
      const v = nums[i];
      h = Number.isNaN(v) || max <= 0 ? 0.75 : 0.75 + (3.25 * v) / max;
    }
    return toneBlock({ key: cellId(cells[i], i), x: i, y: 0, h, text: String(c.value), textOn: 'top', sub: c.sub, tone: c.tone });
  });
}

/** Resolve a pointer `at` (index or cell id) to a block key in a row. */
export function rowResolver(cells: ArrayStructure['cells']) {
  const ids = cells.map(cellId);
  return (at: number | string) => (typeof at === 'number' ? ids[at] : ids.includes(at) ? at : undefined);
}

export function layoutArray(s: ArrayStructure): LayoutResult {
  const out = empty();
  out.blocks = rowBlocks(s.cells, s.variant);
  const ids = s.cells.map(cellId);
  if (s.indices !== false) {
    ids.forEach((id, i) => out.labels.push({ key: `#i${i}`, x: i + 0.5, y: 1.4, text: String(i), kind: 'index', for: id }));
  }
  if (s.window) {
    const [a, b] = s.window;
    const lo = Math.max(0, Math.min(a, b));
    const hi = Math.min(s.cells.length - 1, Math.max(a, b));
    if (hi >= lo) out.zones.push({ key: '#window', x: lo - 0.1, y: -0.14, w: hi - lo + 1.2, d: 1.28, tone: 'active', style: 'outline' });
  }
  out.markers = pointerMarkers(s.pointers, out.blocks, rowResolver(s.cells));
  if (s.label) out.labels.push({ key: '#title', x: -0.4, y: 0.5, text: s.label, kind: 'title', align: 'end' });
  return out;
}

export default layoutArray;
