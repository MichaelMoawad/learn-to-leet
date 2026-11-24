// Stage 2 of the pipeline (SPEC 3.2). Lays each structure out, stacks them vertically, centred,
// with a 24px gap, or puts a `beside` structure to the right of the previous one (32px gap,
// bottom-aligned), snaps every offset to the tile lattice so all structures share one floor grid,
// prefixes keys with the structure id, places Leet and returns flat lists plus bounds.
// Pure: also used by scripts/check-content.ts.
//
// Stacking keeps the 24px gap between what is actually drawn (a skyline of element rects) rather
// than between bounding boxes: isometric rows are diagonal, and box stacking wastes the floor
// under a row's low end, which costs legibility on phones.
//
// composeLesson() uses one shape per structure id for the whole lesson (everything it draws in
// any scene), so a structure that grows (a hash map gaining entries) never pushes its neighbours
// around between steps, and the lesson-wide bounds never change.
import type { Scene, Structure, Tone } from '../content/schema';
import { project } from './iso';
import { layoutStructure, type LayoutContext } from './layout';
import { placeLeet } from './leet';
import { blockRect, blockTop, edgeRect, labelRect, leetSpriteRect, markerRect, titleRise, union, zoneRect } from './metrics';
import type { CBlock, CEdge, CLabel, CMarker, ComposedScene, CZone, LayoutResult, Rect, ResolvedFlow, StructureKind } from './types';

export const STACK_GAP = 24;
export const BESIDE_GAP = 32;

/** Identity rule (SPEC 2.1): `structure.id + '/' + elementId`. */
export const elementKey = (structureId: string, elementId: string) => `${structureId}/${elementId}`;

/** Layout plus the floor notes for `Cell.sub` (drawn in front of the block). */
export function layoutWithSubs(s: Structure, ctx?: LayoutContext & { rise?: number }): LayoutResult {
  let r = layoutStructure(s, ctx);
  if (ctx?.rise) r = { ...r, labels: r.labels.map((l) => (l.kind === 'title' && l.place !== 'below' ? { ...l, rise: ctx.rise } : l)) };
  const subY = s.kind === 'array' && s.indices !== false ? 1.95 : 1.4;
  // Grid cells have no free floor in front (it is the next row's cell), so their `sub` notes are skipped.
  const subs = r.blocks
    .filter((b) => b.sub && s.kind !== 'grid')
    .map((b) => ({ key: `${b.key}#sub`, x: b.x + 0.5, y: b.y + subY, text: b.sub!, kind: 'note' as const, for: b.key }));
  return subs.length ? { ...r, labels: [...r.labels, ...subs] } : r;
}

/** Screen rects of everything a layout draws, at the origin. */
export function layoutRects(r: LayoutResult): Rect[] {
  return [
    ...r.blocks.map(blockRect),
    ...r.markers.map(markerRect),
    ...r.labels.map(labelRect),
    ...r.zones.map(zoneRect),
    ...r.edges.map(edgeRect),
  ];
}

/** Screen box of a layout at the origin. Null when it draws nothing. */
export function layoutBox(r: LayoutResult): Rect | null {
  return layoutRects(r).reduce<Rect | null>((a, b) => union(a, b), null);
}

/**
 * Snap a screen translation to the tile lattice: a whole-tile world offset (dx, dy), whose screen
 * shift is (32m, 16n) with m and n of equal parity. `minX` / `minY` forbid moving left / up of the
 * requested translation, so snapping never shrinks a gap.
 */
export function snapToLattice(tx: number, ty: number, opts: { minX?: boolean; minY?: boolean } = {}): [number, number] {
  let best: [number, number] | null = null;
  let bestCost = Infinity;
  const n0 = Math.floor(ty / 16);
  const m0 = Math.floor(tx / 32);
  for (let n = n0 - 2; n <= n0 + 3; n++) {
    for (let m = m0 - 2; m <= m0 + 3; m++) {
      if (((m + n) & 1) !== 0) continue;
      const sx = m * 32;
      const sy = n * 16;
      if (opts.minX && sx < tx - 1e-9) continue;
      if (opts.minY && sy < ty - 1e-9) continue;
      const cost = Math.abs(sx - tx) + 2 * Math.abs(sy - ty);
      if (cost < bestCost) {
        bestCost = cost;
        best = [(m + n) / 2, (n - m) / 2];
      }
    }
  }
  return best ?? [0, 0];
}

const toWorld = (m: number, n: number): [number, number] => [(m + n) / 2, (n - m) / 2];

/**
 * Place a structure below everything placed so far: near horizontal translation `tx`, as high as
 * possible while every one of its rects stays STACK_GAP below any placed rect it overlaps
 * horizontally (a skyline, so a diagonal row does not waste the floor under its low end), and
 * never above `minTop`. Returns a lattice-snapped world offset.
 */
export function snapBelow(tx: number, rects: Rect[], placed: Rect[], minTop: number): [number, number] {
  const top = Math.min(...rects.map((r) => r.y));
  const m0 = Math.round(tx / 32);
  let best: [number, number] = [0, 0];
  let bestCost = Infinity;
  for (let m = m0 - 1; m <= m0 + 1; m++) {
    const sx = m * 32;
    let req = minTop - top;
    for (const r of rects) {
      for (const p of placed) {
        if (r.x + sx < p.x + p.w + 8 && p.x < r.x + sx + r.w + 8) req = Math.max(req, p.y + p.h + STACK_GAP - r.y);
      }
    }
    let n = Math.ceil(req / 16 - 1e-9);
    if (((m + n) & 1) !== 0) n++;
    const cost = Math.abs(sx - tx) + 2 * (n * 16 - req);
    if (cost < bestCost) {
      bestCost = cost;
      best = toWorld(m, n);
    }
  }
  return best;
}

const ZERO: Rect = { x: 0, y: 0, w: 0, h: 0 };
const shiftRect = (r: Rect, dx: number, dy: number): Rect => {
  const [sx, sy] = project(dx, dy);
  return { x: r.x + sx, y: r.y + sy, w: r.w, h: r.h };
};

/** Compose one scene. `shapes` (structure id -> local rects) keeps placement stable across a lesson. */
export function composeScene(scene: Scene, shapes?: Map<string, Rect[]>, slots?: Map<string, number>, rises?: Map<string, number>): ComposedScene {
  const layouts = scene.structures.map((s) => layoutWithSubs(s, { slots: slots?.get(s.id), rise: rises?.get(s.id) }));
  const localRects = scene.structures.map((s, i) => {
    const r = shapes?.get(s.id) ?? layoutRects(layouts[i]);
    return r.length ? r : [ZERO];
  });
  const localBoxes = localRects.map((rs) => rs.reduce<Rect | null>((a, b) => union(a, b), null) ?? ZERO);

  // Rows: a structure followed by its chain of `beside` structures.
  const rows: number[][] = [];
  scene.structures.forEach((s, i) => {
    if (s.beside && rows.length) rows[rows.length - 1].push(i);
    else rows.push([i]);
  });

  const offsets: [number, number][] = new Array(scene.structures.length);
  const placed: Rect[] = new Array(scene.structures.length);
  const placedRects: Rect[] = [];
  let rowTop = 0;
  rows.forEach((row, r) => {
    const width = row.reduce((w, i) => w + localBoxes[i].w, 0) + BESIDE_GAP * (row.length - 1);
    let left = -width / 2;
    const rowRects: Rect[] = [];
    row.forEach((i, k) => {
      const b = localBoxes[i];
      const tx = left - b.x;
      let off: [number, number];
      if (k > 0) {
        const prev = placed[row[k - 1]];
        off = snapToLattice(tx, prev.y + prev.h - (b.y + b.h), { minX: true });
      } else if (r === 0) {
        off = snapToLattice(tx, -b.y);
      } else {
        off = snapBelow(tx, localRects[i], placedRects, rowTop);
      }
      offsets[i] = off;
      placed[i] = shiftRect(b, off[0], off[1]);
      for (const lr of localRects[i]) rowRects.push(shiftRect(lr, off[0], off[1]));
      left = placed[i].x + placed[i].w + BESIDE_GAP;
    });
    rowTop = Math.min(...row.map((i) => placed[i].y));
    placedRects.push(...rowRects);
  });

  const blocks: CBlock[] = [];
  const edges: CEdge[] = [];
  const zones: CZone[] = [];
  const markers: CMarker[] = [];
  const labels: CLabel[] = [];
  scene.structures.forEach((s, i) => {
    const [dx, dy] = offsets[i];
    const own = { sid: s.id, skind: s.kind as StructureKind };
    const k = (local: string) => elementKey(s.id, local);
    const r = layouts[i];
    for (const b of r.blocks) blocks.push({ ...b, ...own, key: k(b.key), x: b.x + dx, y: b.y + dy });
    for (const e of r.edges) edges.push({ ...e, ...own, key: k(e.key), points: e.points.map(([x, y]) => [x + dx, y + dy] as [number, number]) });
    for (const z of r.zones) zones.push({ ...z, ...own, key: k(z.key), x: z.x + dx, y: z.y + dy });
    for (const m of r.markers) markers.push({ ...m, ...own, key: k(m.key), x: m.x + dx, y: m.y + dy, for: m.for !== undefined ? k(m.for) : undefined });
    for (const l of r.labels) labels.push({ ...l, ...own, key: k(l.key), x: l.x + dx, y: l.y + dy, for: l.for !== undefined ? k(l.for) : undefined });
  });

  // Structure order is kept for Leet's anchor; draw order is back to front.
  const inOrder = blocks.slice();
  blocks.sort(depthCompare);

  const byKey = new Map(blocks.map((b) => [b.key, b]));
  const flows: ResolvedFlow[] = [];
  for (const f of scene.flows ?? []) {
    const a = byKey.get(f.from);
    const b = byKey.get(f.to);
    if (!a || !b) continue;
    flows.push({ key: `flow:${f.from}>${f.to}`, from: blockTop(a), to: blockTop(b), tone: f.tone ?? 'active', loop: f.loop !== false });
  }

  const partial = {
    blocks,
    edges,
    zones,
    markers,
    labels,
    flows,
    structures: scene.structures.map((s, i) => ({ id: s.id, kind: s.kind, offset: offsets[i], box: placed[i] })),
  };
  const leet = placeLeet(scene, { ...partial, inOrder });

  let bounds: Rect | null = null;
  for (const b of blocks) bounds = union(bounds, blockRect(b));
  for (const m of markers) bounds = union(bounds, markerRect(m));
  for (const l of labels) bounds = union(bounds, labelRect(l));
  for (const z of zones) bounds = union(bounds, zoneRect(z));
  for (const e of edges) bounds = union(bounds, edgeRect(e));
  if (leet) bounds = union(bounds, leetSpriteRect(leet.sx, leet.sy));

  return { ...partial, leet, bounds: bounds ?? ZERO };
}

/** Draw order (SPEC 3.1): blocks sorted by x + y, then z. Key breaks ties so the order is stable. */
export function depthCompare(a: { x: number; y: number; z: number; key: string }, b: { x: number; y: number; z: number; key: string }): number {
  return a.x + a.y - (b.x + b.y) || a.z - b.z || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}

export interface ComposedLesson {
  scenes: ComposedScene[];
  /** Union of every scene's bounds, Leet included. The view is fitted to this once. */
  bounds: Rect;
  /** Tones used by any element in the lesson, for the legend. */
  tones: Tone[];
}

export function composeLesson(scenes: Scene[]): ComposedLesson {
  // Every rect a structure draws in any scene, so its placement is the same on every step.
  // Hash maps reserve room for their fullest step (empty slots are drawn).
  const slots = new Map<string, number>();
  for (const scene of scenes) {
    for (const s of scene.structures) if (s.kind === 'hashmap') slots.set(s.id, Math.max(slots.get(s.id) ?? 0, s.entries.length));
  }
  // A title pill is lifted until it clears every block of its structure in any step.
  const rises = new Map<string, number>();
  for (const scene of scenes) {
    for (const s of scene.structures) {
      const r = layoutStructure(s, { slots: slots.get(s.id) });
      for (const l of r.labels) if (l.kind === 'title' && l.place !== 'below') rises.set(s.id, Math.max(rises.get(s.id) ?? 0, titleRise(l, r.blocks, r.markers)));
    }
  }
  const shapes = new Map<string, Rect[]>();
  for (const scene of scenes) {
    for (const s of scene.structures) {
      const list = shapes.get(s.id) ?? [];
      list.push(...layoutRects(layoutWithSubs(s, { slots: slots.get(s.id), rise: rises.get(s.id) })));
      shapes.set(s.id, list);
    }
  }
  const composed = scenes.map((s) => composeScene(s, shapes, slots, rises));
  let bounds: Rect | null = null;
  const used = new Set<Tone>();
  for (const c of composed) {
    if (c.blocks.length || c.markers.length || c.labels.length) bounds = union(bounds, c.bounds);
    for (const b of c.blocks) used.add(b.tone);
    for (const e of c.edges) used.add(e.tone);
  }
  return { scenes: composed, bounds: bounds ?? ZERO, tones: [...used] };
}
