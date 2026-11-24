// Helpers shared by every layout. Layouts emit keys local to their structure (the element id);
// compose.ts prefixes them with the structure id.
import type { Cell, CellInput, Pointer, Tone } from '../../content/schema';
import { LIFT } from '../iso';
import type { BlockSpec, LayoutResult, MarkerSpec } from '../types';

export const empty = (): LayoutResult => ({ blocks: [], edges: [], zones: [], markers: [], labels: [] });

export const normCell = (c: CellInput): Cell => (typeof c === 'object' ? c : { value: c });

/** Element id rule (SPEC 2.1): `cell.id` if set, else the index. */
export const cellId = (c: CellInput, i: number): string => (typeof c === 'object' && c.id ? c.id : String(i));

/**
 * Apply the tone rules every kind shares (SPEC 3.3): `active` floats LIFT above the floor (its
 * shadow stays put), `muted` flattens to h = 0.25. Pass `lift: false` where floating would collide
 * (stack items).
 */
export function toneBlock(b: Omit<BlockSpec, 'tone' | 'z'> & { tone?: Tone; z?: number }, opts: { lift?: boolean } = {}): BlockSpec {
  const tone = b.tone ?? 'idle';
  const z = (b.z ?? 0) + (tone === 'active' && opts.lift !== false ? LIFT : 0);
  const h = tone === 'muted' ? Math.min(b.h, 0.25) : b.h;
  return { ...b, tone, z, h };
}

/**
 * Default block height in units for array cells, queue items and hash map keys: 1.5, chunkier than
 * the SPEC 3.3 default of 1 so blocks read as objects rather than slabs. Explicit `h` and bars keep
 * their own heights.
 */
export const DEFAULT_H = 1.5;

/** Gap between a block top and the first marker tip, and between stacked markers, in units. */
export const MARKER_GAP = 1.05;
export const MARKER_STEP = 2.3;

/**
 * Pointer markers for a row of blocks: each pointer floats above its target block, several on one
 * block stack upward in the order given. `resolve` maps a pointer's `at` to a block key.
 */
export function pointerMarkers(
  pointers: Pointer[] | undefined,
  blocks: BlockSpec[],
  resolve: (at: number | string) => string | undefined,
): MarkerSpec[] {
  if (!pointers?.length) return [];
  const byKey = new Map(blocks.map((b) => [b.key, b]));
  const count = new Map<string, number>();
  const out: MarkerSpec[] = [];
  for (const p of pointers) {
    const key = resolve(p.at);
    const b = key !== undefined ? byKey.get(key) : undefined;
    if (!b) continue;
    const k = count.get(b.key) ?? 0;
    count.set(b.key, k + 1);
    out.push({
      key: `@${p.id}`,
      x: b.x + 0.5,
      y: b.y + 0.5,
      z: b.z + b.h + MARKER_GAP + k * MARKER_STEP,
      text: p.id,
      tone: p.tone ?? 'active',
      for: b.key,
    });
  }
  return out;
}
