// hashmap (SPEC 3.3): entries along x on a floor plate. Each entry is a pair: the key block at the
// back (y = 0) and a shorter, dimmer value block in front, touching it (y = VALUE_Y). Entries sit
// ENTRY_PITCH tiles apart so the gap between entries is wider than the seam inside one, which
// reads as pairs. A set (no values) is the key row only. New entries append at the end.
// Element id is the key; the value block is `<key>#value`. With `slots` (the lesson-wide entry
// count, passed by compose) the plate is sized for the fullest step and empty slots show as faint
// dashed floor tiles.
import type { HashMapStructure } from '../../content/schema';
import type { LayoutResult } from '../types';
import { DEFAULT_H, empty, toneBlock } from './common';

export const VALUE_H = 0.75;
/** Blocks are 0.875 of a tile wide, so the value block touches its key at y = 0.875. */
export const VALUE_Y = 0.875;
/** Tiles between consecutive entries along x. Deviation from SPEC 3.3 (1), for pair readability. */
export const ENTRY_PITCH = 1.5;

export function layoutHashmap(s: HashMapStructure, opts: { slots?: number } = {}): LayoutResult {
  const out = empty();
  const isSet = s.entries.length > 0 && s.entries.every((e) => e.value === undefined);
  const depth = isSet ? 1 : VALUE_Y + 1;
  s.entries.forEach((e, i) => {
    const key = String(e.key);
    const x = i * ENTRY_PITCH;
    out.blocks.push(toneBlock({ key, x, y: 0, h: DEFAULT_H, text: key, textOn: 'top', tone: e.tone, role: 'key' }));
    if (e.value !== undefined) {
      out.blocks.push(toneBlock({ key: `${key}#value`, x, y: VALUE_Y, h: VALUE_H, text: String(e.value), textOn: 'top', tone: e.tone, role: 'value' }, { lift: false }));
    }
  });
  const n = Math.max(1, s.entries.length, opts.slots ?? 0);
  // Plate first so the dashed empty slots draw on top of it.
  out.zones.push({ key: '#plate', x: -0.25, y: -0.25, w: (n - 1) * ENTRY_PITCH + 1.5, d: depth + 0.5, tone: 'idle', style: 'plate' });
  for (let i = s.entries.length; i < n; i++) {
    out.zones.push({ key: `#slot${i}`, x: i * ENTRY_PITCH + 0.08, y: 0.08, w: 0.84, d: depth - 0.16, tone: 'idle', style: 'outline' });
  }
  // Below the plate's front-left corner, extending left, so it never covers entries further along.
  if (s.label) out.labels.push({ key: '#title', x: 0.1, y: depth + 0.3, text: s.label, kind: 'title', place: 'below', align: 'end' });
  return out;
}

export default layoutHashmap;
