// linkedList (SPEC 3.3): nodes along x on every second tile (node i on tile x = 2i, y = 0), drawn in
// array order. A `next` to the following node is a floor arrow across the gap, run a little in front
// of the centre line (ARROW_Y) because the floor just behind a block is hidden by the block itself
// in isometric; it ends where it meets the next block's silhouette. Any other
// `next` (rewiring, backward or skipping ahead) is an arc that leaves the front face of its node,
// bottoms out on the lane in front of the row (y = 1.5, a deeper lane when spans overlap) and comes
// back up into the front face of its target, so a reversal reads as a row of backward arcs.
// A `next` of null, or the last node's default, is a stub ending in a pixel cross (EdgeSpec cap 'cross'): forward off the
// end of the row when nothing follows, else down toward the lane (so it never reads as a link to
// the node after it).
// Arrows light up in the target's tone once both ends are lit (the tree rule), so a rewired or
// walked part of the list stands out. Element id is the node id; edges are `<from>><to>` (or `<from>>null`), so a rewired pointer fades
// out and the new one draws in.
import type { LinkedListStructure } from '../../content/schema';
import type { EdgeSpec, LayoutResult } from '../types';
import { empty, pointerMarkers, toneBlock } from './common';
import { edgeTone } from './tree';

export const NODE_STEP = 2;
export const LANE_Y = 1.5;
export const LANE_STEP = 0.4;
/** Blocks are inset 1/16 of a tile from their tile edges. */
const FACE = 1 / 16;
/** Floor y of forward arrows and stubs. */
export const ARROW_Y = 0.72;
/**
 * Floor x where a line at floor y meets the left edge of the silhouette of a block on tile (bx, 0),
 * less `gap` px: the block's left vertex is 28px left of its tile's top vertex on screen.
 */
const silhouetteLeftX = (bx: number, y: number, gap: number) => bx + y - (32 - 4 + gap) / 32;
/** Lane edges leave and arrive this far either side of the node centre, so in and out never overlap. */
const PORT = 0.18;
/** Samples along a lane arc. */
const ARC_SEGMENTS = 12;
/** Null stub length past the node's face, in tiles. */
export const STUB = 0.48;

/**
 * Lane arc from node centre fromX to node centre toX: leaves the source's front face straight
 * down, sweeps as a half ellipse whose lowest point is on the lane (laneY), and comes straight back
 * up into the target's front face, so the arrowhead points at the target.
 */
export function lanePath(fromX: number, toX: number, laneY: number, topY = 1 - FACE + 0.05): [number, number][] {
  const s = Math.sign(toX - fromX) || 1;
  const x0 = fromX + s * PORT;
  const x1 = toX - s * PORT;
  const mid = (x0 + x1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = laneY - topY;
  const pts: [number, number][] = [];
  for (let k = 0; k <= ARC_SEGMENTS; k++) {
    const t = (k / ARC_SEGMENTS) * Math.PI;
    pts.push([mid - rx * Math.cos(t), topY + ry * Math.sin(t)]);
  }
  return pts;
}

export function layoutLinkedList(s: LinkedListStructure): LayoutResult {
  const out = empty();
  const index = new Map(s.nodes.map((n, i) => [n.id, i]));
  s.nodes.forEach((n, i) => {
    out.blocks.push(toneBlock({ key: n.id, x: i * NODE_STEP, y: 0, h: 1, text: String(n.value), textOn: 'top', tone: n.tone }));
  });

  // Lane edges first, so overlapping spans can take deeper lanes.
  const lanes: { lo: number; hi: number; lane: number }[] = [];
  s.nodes.forEach((n, i) => {
    const from = out.blocks[i];
    const target = n.next === undefined ? s.nodes[i + 1]?.id ?? null : n.next;
    const j = target === null ? undefined : index.get(target);
    const cx = i * NODE_STEP + 0.5;
    if (j === undefined) {
      // null, or a target that is not in the list: a stub ending in a cross.
      const stubTone = n.tone === 'muted' ? 'muted' : 'idle';
      if (i === s.nodes.length - 1) {
        const x0 = i * NODE_STEP + 1 - FACE;
        const x1 = x0 + STUB;
        out.edges.push({ key: `${n.id}>null`, points: [[x0, ARROW_Y], [x1, ARROW_Y]], tone: stubTone, arrow: false, cap: 'cross' });
      } else {
        const x = cx - PORT;
        const y0 = 1 - FACE + 0.05;
        const y1 = y0 + STUB;
        out.edges.push({ key: `${n.id}>null`, points: [[x, y0], [x, y1]], tone: stubTone, arrow: false, cap: 'cross' });
      }
      return;
    }
    const tone = edgeTone(from.tone, out.blocks[j].tone);
    let edge: EdgeSpec;
    if (j === i + 1) {
      const x1 = silhouetteLeftX(j * NODE_STEP, ARROW_Y, 3);
      edge = { key: `${n.id}>${target}`, points: [[i * NODE_STEP + 1 - FACE, ARROW_Y], [x1, ARROW_Y]], tone, arrow: true };
    } else {
      const tx = j * NODE_STEP + 0.5;
      const lo = Math.min(cx, tx);
      const hi = Math.max(cx, tx);
      let lane = 0;
      while (lanes.some((l) => l.lane === lane && l.lo < hi + 0.4 && lo < l.hi + 0.4 && !(Math.abs(l.lo - hi) < 1e-6 || Math.abs(l.hi - lo) < 1e-6))) lane++;
      lanes.push({ lo, hi, lane });
      edge = { key: `${n.id}>${target}`, points: lanePath(cx, tx, LANE_Y + lane * LANE_STEP), tone, arrow: true };
    }
    out.edges.push(edge);
  });

  const ids = s.nodes.map((n) => n.id);
  out.markers = pointerMarkers(s.pointers, out.blocks, (at) => (typeof at === 'number' ? ids[at] : ids.includes(at) ? at : undefined));
  if (s.label) out.labels.push({ key: '#title', x: -0.4, y: 0.5, text: s.label, kind: 'title', align: 'end' });
  return out;
}

export default layoutLinkedList;
