// graph (SPEC 3.3): screen-aligned. Node `at` [col, row] times (96px, 64px), converted to the floor
// with `unproject`. Edges are straight floor lines between node centres, trimmed at least 20px short
// of each centre, and further where needed so the end (and its arrowhead when `directed`) clears the
// block's on-screen silhouette instead of hiding under it. Optional upright label at the midpoint.
// Element id is the node id; an edge is `<from>><to>`.
// Also exports the screen-placed node helpers the tree layout shares.
import type { GraphStructure, Pointer, Tone } from '../../content/schema';
import { project, unproject, ZU } from '../iso';
import { INSET_X, INSET_Y, type Pt } from '../metrics';
import type { BlockSpec, LabelSpec, LayoutResult } from '../types';
import { empty, pointerMarkers, toneBlock } from './common';

export const COL_PX = 96;
export const ROW_PX = 64;
/** Minimum trim from a node centre (SPEC 3.3). */
export const TRIM = 20;
/** Clearance between an edge end and the block silhouette, px. Arrowheads get a little more. */
const GAP_START = 2;
const GAP_END = 3;
/** Perpendicular offset, px, for the two edges of a directed pair a>b and b>a. */
const PAIR_OFFSET = 6;
/** Title anchor offset left of the top-left node centre, px (the pill ends 12px right of it). */
const TITLE_DX = 34;
/** ...and above it, px, so the anchor dot clears edges arriving at that node from below left. */
const TITLE_DY = 16;

/** A block centred on the floor point under screen point (sx, sy). */
export function screenBlock(key: string, sx: number, sy: number, text: string, tone?: Tone): BlockSpec {
  const [cx, cy] = unproject(sx, sy);
  return toneBlock({ key, x: cx - 0.5, y: cy - 0.5, h: 1, text, textOn: 'top', tone });
}

/** Screen point of a block's floor centre. */
export const blockCentre = (b: Pick<BlockSpec, 'x' | 'y'>): Pt => project(b.x + 0.5, b.y + 0.5);

/**
 * Distance from a block's floor centre, along screen direction (ux, uy) (unit), to the edge of its
 * on-screen silhouette: the hexagon hull of the inset footprint at z and at z + h.
 */
export function silhouetteExit(b: Pick<BlockSpec, 'z' | 'h'>, ux: number, uy: number): number {
  const a = 32 - INSET_X;
  const c = 16 - INSET_Y;
  const d0 = b.z * ZU;
  const d1 = (b.z + b.h) * ZU;
  // Hull, clockwise on screen: bottom vertex, right low, right high, top, left high, left low.
  const hull: Pt[] = [
    [0, c - d0],
    [a, -d0],
    [a, -d1],
    [0, -c - d1],
    [-a, -d1],
    [-a, -d0],
  ];
  const inside = (px: number, py: number) => {
    let sign = 0;
    for (let i = 0; i < hull.length; i++) {
      const [x1, y1] = hull[i];
      const [x2, y2] = hull[(i + 1) % hull.length];
      const cr = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
      if (Math.abs(cr) < 1e-9) continue;
      const s = Math.sign(cr);
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
    return true;
  };
  if (!inside(0, 0)) return 0;
  let lo = 0;
  let hi = 200;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (inside(ux * mid, uy * mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Floor polyline from block `a` to block `b`, trimmed so both ends clear the silhouettes (never less
 * than TRIM from either centre). `offset` shifts the line sideways in screen px. Null when the two
 * blocks are too close to leave a visible line.
 */
export function trimmedEdge(a: BlockSpec, b: BlockSpec, opts: { arrow?: boolean; offset?: number } = {}): [number, number][] | null {
  const [ax, ay] = blockCentre(a);
  const [bx, by] = blockCentre(b);
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1e-6) return null;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const ox = -uy * (opts.offset ?? 0);
  const oy = ux * (opts.offset ?? 0);
  const s = Math.max(TRIM, silhouetteExit(a, ux, uy) + GAP_START);
  const e = Math.max(TRIM, silhouetteExit(b, -ux, -uy) + (opts.arrow ? GAP_END : GAP_START));
  if (s + e > len - 4) return null;
  const p0 = unproject(ax + ux * s + ox, ay + uy * s + oy);
  const p1 = unproject(bx - ux * e + ox, by - uy * e + oy);
  return [p0, p1];
}

/** Resolve a pointer `at` (node id, or index into the node list) to a block key. */
export function nodeResolver(ids: string[]) {
  return (at: number | string) => (typeof at === 'number' ? ids[at] : ids.includes(at) ? at : undefined);
}

/**
 * Title pill floating above and to the left of the leftmost node in the top row (the root of a
 * tree), ending just short of the block so it never covers nodes, edges or pointers below it.
 */
export function topLeftTitle(text: string, blocks: BlockSpec[]): LabelSpec {
  const cs = blocks.map(blockCentre);
  const top = Math.min(...cs.map((c) => c[1]));
  const left = Math.min(...cs.filter((c) => c[1] < top + 1).map((c) => c[0]));
  const [x, y] = unproject(left - TITLE_DX, top - TITLE_DY);
  return { key: '#title', x, y, text, kind: 'title', align: 'end' };
}

export function pointersFor(pointers: Pointer[] | undefined, blocks: BlockSpec[], ids: string[]) {
  return pointerMarkers(pointers, blocks, nodeResolver(ids));
}

export function layoutGraph(s: GraphStructure): LayoutResult {
  const out = empty();
  const byId = new Map<string, BlockSpec>();
  for (const n of s.nodes) {
    const [col, row] = n.at;
    const b = screenBlock(n.id, col * COL_PX, row * ROW_PX, String(n.value ?? n.id), n.tone);
    byId.set(n.id, b);
    out.blocks.push(b);
  }
  const directed = s.directed === true;
  const pairs = new Set(s.edges.map((e) => `${e.from}>${e.to}`));
  for (const e of s.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const both = directed && e.from !== e.to && pairs.has(`${e.to}>${e.from}`);
    const points = trimmedEdge(a, b, { arrow: directed, offset: both ? PAIR_OFFSET : 0 });
    if (!points) continue;
    out.edges.push({ key: `${e.from}>${e.to}`, points, tone: e.tone ?? 'idle', arrow: directed, label: e.label });
  }
  out.markers = pointersFor(s.pointers, out.blocks, s.nodes.map((n) => n.id));
  if (s.label && out.blocks.length) out.labels.push(topLeftTitle(s.label, out.blocks));
  return out;
}

export default layoutGraph;
