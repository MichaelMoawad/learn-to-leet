// tree (SPEC 3.3): screen-aligned so it still reads top down. Column = in-order position at 48px,
// row = depth at 64px, converted to the floor with `unproject`. Edges are floor lines from parent to
// child, trimmed to clear both blocks, no arrowheads, lit in the child's tone once both ends are
// lit. A node's `sub` is a small floor note directly below it on screen (between its two child
// edges). The title floats above and left of the root. Element id is the node id; an edge is
// `<parent>><child>`. Nodes not reachable from `root` are not drawn.
import type { Tone, TreeStructure } from '../../content/schema';
import { unproject } from '../iso';
import type { BlockSpec, LayoutResult } from '../types';
import { empty } from './common';
import { blockCentre, topLeftTitle, pointersFor, screenBlock, trimmedEdge } from './graph';

export const TREE_COL_PX = 48;
export const TREE_ROW_PX = 64;
/** Sub note offset below the node centre, px. */
export const SUB_PX = 24;

/** An edge lights up in its child's tone once both ends are lit (a traversal path); muted wins. */
export function edgeTone(parent: Tone, child: Tone): Tone {
  if (parent === 'muted' || child === 'muted') return 'muted';
  if (parent === 'idle' || child === 'idle') return 'idle';
  return child;
}

export function layoutTree(s: TreeStructure): LayoutResult {
  const out = empty();
  const byId = new Map(s.nodes.map((n) => [n.id, n]));
  // In-order positions and depths, guarded against cycles.
  const pos = new Map<string, { col: number; depth: number }>();
  let col = 0;
  const seen = new Set<string>();
  const walk = (id: string | undefined | null, depth: number) => {
    if (!id || seen.has(id)) return;
    const n = byId.get(id);
    if (!n) return;
    seen.add(id);
    walk(n.left, depth + 1);
    pos.set(id, { col: col++, depth });
    walk(n.right, depth + 1);
  };
  walk(s.root, 0);

  const blocks = new Map<string, BlockSpec>();
  for (const n of s.nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const b = screenBlock(n.id, p.col * TREE_COL_PX, p.depth * TREE_ROW_PX, String(n.value), n.tone);
    blocks.set(n.id, b);
    out.blocks.push(b);
  }
  for (const n of s.nodes) {
    const a = blocks.get(n.id);
    if (!a) continue;
    for (const child of [n.left, n.right]) {
      const b = child ? blocks.get(child) : undefined;
      if (!b) continue;
      const points = trimmedEdge(a, b);
      if (points) out.edges.push({ key: `${n.id}>${child}`, points, tone: edgeTone(a.tone, b.tone), arrow: false });
    }
    if (n.sub) {
      const [sx, sy] = blockCentre(a);
      const [x, y] = unproject(sx, sy + SUB_PX);
      out.labels.push({ key: `${n.id}#sub`, x, y, text: n.sub, kind: 'note', for: n.id });
    }
  }
  out.markers = pointersFor(s.pointers, out.blocks, s.nodes.map((n) => n.id));
  if (s.label && out.blocks.length) out.labels.push(topLeftTitle(s.label, out.blocks));
  return out;
}

export default layoutTree;
