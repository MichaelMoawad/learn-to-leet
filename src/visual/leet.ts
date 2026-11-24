// Where Leet stands in a scene (SPEC 3.0 item 6). Pure.
//
// Anchor: `scene.leet.at` if it names an element, else the first structure's first pointer target,
// else the first `active` block (structure order), else the first block of the first structure.
// Leet stands on a whole floor tile as close to the anchor as possible while staying fully
// visible: its sprite box (feet and shadow included) never touches a block, marker, label or edge.
// With 1.5-unit blocks the nearest such tile is two rows behind the anchor cell (up and to the
// right on screen), clear of the next block's top face, so Leet walks along the lane behind the
// row with a pointer. Leet is depth-sorted with the blocks by its tile.
import type { LeetPose, Scene } from '../content/schema';
import { project } from './iso';
import { blockRect, edgeRect, labelRect, leetRect, markerRect, overlaps } from './metrics';
import type { CBlock, ComposedScene, LeetPlacement, Rect } from './types';

type Parts = Omit<ComposedScene, 'leet' | 'bounds'> & { inOrder: CBlock[] };

// Tile offsets from the anchor's tile, best first. Behind the row (negative y) keeps Leet clear of
// the index labels and of structures stacked below.
const PREFERRED: [number, number][] = [
  [0, -2], [1, -2], [-1, -2], [0, -3], [1, -3], [2, -2], [-1, -3], [2, -3],
];

function candidates(): [number, number][] {
  const rest: [number, number][] = [];
  for (let dy = -5; dy <= 4; dy++) for (let dx = -5; dx <= 7; dx++) rest.push([dx, dy]);
  const dist = ([dx, dy]: [number, number]) => {
    const [sx, sy] = project(dx, dy);
    return Math.hypot(sx, sy) + (dx + dy > 0 ? 80 : 0);
  };
  rest.sort((a, b) => dist(a) - dist(b));
  const seen = new Set(PREFERRED.map((p) => p.join()));
  return [...PREFERRED, ...rest.filter((p) => !seen.has(p.join()))];
}
const CANDIDATES = candidates();

export function leetAnchor(scene: Scene, c: Parts): CBlock | null {
  const byKey = new Map(c.blocks.map((b) => [b.key, b]));
  const at = scene.leet?.at;
  if (at) {
    const direct = byKey.get(at);
    if (direct) return direct;
    const m = c.markers.find((x) => x.key === at);
    if (m?.for && byKey.get(m.for)) return byKey.get(m.for)!;
  }
  const first = scene.structures[0]?.id;
  const ptr = c.markers.find((m) => m.sid === first && m.for && byKey.has(m.for));
  if (ptr) return byKey.get(ptr.for!)!;
  const active = c.inOrder.find((b) => b.tone === 'active');
  if (active) return active;
  return c.inOrder.find((b) => b.sid === first) ?? c.inOrder[0] ?? null;
}

export function placeLeet(scene: Scene, c: Parts): LeetPlacement | null {
  if (scene.leet?.hidden) return null;
  const anchor = leetAnchor(scene, c);
  if (!anchor) return null;
  const obstacles: Rect[] = [
    ...c.blocks.map(blockRect),
    ...c.markers.map(markerRect),
    ...c.labels.map(labelRect),
    ...c.edges.map(edgeRect),
  ];
  const ax = Math.floor(anchor.x);
  const ay = Math.floor(anchor.y);
  let fallback: LeetPlacement | null = null;
  for (const [dx, dy] of CANDIDATES) {
    const tx = ax + dx;
    const ty = ay + dy;
    const [sx, sy] = project(tx + 0.5, ty + 0.5);
    const spot = { tx, ty, sx, sy, anchor: anchor.key };
    fallback ??= spot;
    const r = leetRect(sx, sy);
    if (!obstacles.some((o) => overlaps(r, o, 3))) return spot;
  }
  return fallback;
}

/** Same picture: structures and vars match (captions and Leet overrides are ignored). */
const sameScene = (a: Scene, b: Scene) => a === b || JSON.stringify([a.structures, a.vars ?? []]) === JSON.stringify([b.structures, b.vars ?? []]);

/** True when a var or any element of a structure (cell, item, entry, node) has tone `good`. */
export function hasGood(scene: Scene): boolean {
  if (scene.vars?.some((v) => v.tone === 'good')) return true;
  const good = (c: unknown) => typeof c === 'object' && c !== null && (c as { tone?: string }).tone === 'good';
  return scene.structures.some((s) => {
    switch (s.kind) {
      case 'array':
        return s.cells.some(good);
      case 'stack':
      case 'queue':
        return s.items.some(good);
      case 'grid':
        return s.rows.some((r) => r.some(good));
      case 'hashmap':
        return s.entries.some(good);
      case 'linkedList':
      case 'tree':
      case 'graph':
        return s.nodes.some(good);
    }
  });
}

/**
 * Pose for step `index` of a lesson: the author's `scene.leet.pose` always wins. Otherwise Leet
 * cheers only on the last distinct scene (the final scene and any trailing steps repeating it),
 * and only when that scene has a `good` var or element. Everything else idles.
 */
export function leetPose(scenes: Scene[], index: number): LeetPose {
  const scene = scenes[index];
  if (!scene) return 'idle';
  if (scene.leet?.pose) return scene.leet.pose;
  const last = scenes[scenes.length - 1];
  for (let i = scenes.length - 1; i > index; i--) if (!sameScene(scenes[i], last)) return 'idle';
  if (!sameScene(scene, last)) return 'idle';
  return hasGood(last) ? 'cheer' : 'idle';
}
