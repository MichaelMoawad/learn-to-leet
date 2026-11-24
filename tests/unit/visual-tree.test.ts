import { describe, expect, it } from 'vitest';
import type { TreeStructure } from '../../src/content/schema';
import { composeLesson, composeScene } from '../../src/visual/compose';
import { project } from '../../src/visual/iso';
import { blockCentre, TRIM } from '../../src/visual/layout/graph';
import { edgeTone, layoutTree, SUB_PX, TREE_COL_PX, TREE_ROW_PX } from '../../src/visual/layout/tree';
import samples from '../../src/visual/samples/tree';

// 2 <- 4 -> 6, 6 has left child 5: in-order 2, 4, 5, 6.
const T: TreeStructure = {
  kind: 'tree',
  id: 't',
  root: 'n4',
  nodes: [
    { id: 'n4', value: 4, left: 'n2', right: 'n6' },
    { id: 'n2', value: 2 },
    { id: 'n6', value: 6, left: 'n5', tone: 'visited', sub: 'd=2' },
    { id: 'n5', value: 5, tone: 'active' },
    { id: 'orphan', value: 9 },
  ],
  pointers: [{ id: 'node', at: 'n6' }],
};
const screen = (r: ReturnType<typeof layoutTree>, key: string) => {
  const [x, y] = blockCentre(r.blocks.find((b) => b.key === key)!);
  return [Math.round(x), Math.round(y)];
};

describe('tree layout', () => {
  it('places column = in-order position at 48px and row = depth at 64px, screen aligned', () => {
    const r = layoutTree(T);
    expect(screen(r, 'n2')).toEqual([0, TREE_ROW_PX]);
    expect(screen(r, 'n4')).toEqual([TREE_COL_PX, 0]);
    expect(screen(r, 'n5')).toEqual([2 * TREE_COL_PX, 2 * TREE_ROW_PX]);
    expect(screen(r, 'n6')).toEqual([3 * TREE_COL_PX, TREE_ROW_PX]);
    expect(r.blocks.some((b) => b.key === 'orphan')).toBe(false);
  });

  it('draws parent to child floor edges without arrowheads, trimmed clear of both blocks', () => {
    const r = layoutTree(T);
    expect(r.edges.map((e) => e.key).sort()).toEqual(['n4>n2', 'n4>n6', 'n6>n5']);
    for (const e of r.edges) {
      expect(e.arrow).toBe(false);
      const [from, to] = e.key.split('>');
      const a = screen(r, from);
      const b = screen(r, to);
      const p0 = project(...e.points[0]);
      const p1 = project(...e.points[e.points.length - 1]);
      expect(Math.hypot(p0[0] - a[0], p0[1] - a[1])).toBeGreaterThanOrEqual(TRIM - 0.01);
      expect(Math.hypot(p1[0] - b[0], p1[1] - b[1])).toBeGreaterThanOrEqual(TRIM - 0.01);
      // The child end clears the child's top face, which reaches 30px above its centre.
      expect(p1[1]).toBeLessThan(b[1] - 14);
    }
  });

  it('lights an edge in the child tone once both ends are lit', () => {
    const r = layoutTree(T);
    expect(r.edges.find((e) => e.key === 'n6>n5')!.tone).toBe('active');
    expect(r.edges.find((e) => e.key === 'n4>n6')!.tone).toBe('idle');
    expect(edgeTone('visited', 'muted')).toBe('muted');
  });

  it('puts sub as a floor note directly below the node and pointers above it', () => {
    const r = layoutTree(T);
    const note = r.labels.find((l) => l.key === 'n6#sub')!;
    expect(note).toMatchObject({ kind: 'note', text: 'd=2', for: 'n6' });
    const [sx, sy] = project(note.x, note.y);
    const c = screen(r, 'n6');
    expect(Math.round(sx)).toBe(c[0]);
    expect(Math.round(sy)).toBe(c[1] + SUB_PX);
    expect(r.markers).toEqual([expect.objectContaining({ key: '@node', for: 'n6' })]);
    // compose must not add a second note for it
    const composed = composeScene({ structures: [T] });
    expect(composed.labels.filter((l) => l.key.endsWith('#sub'))).toHaveLength(1);
    expect(composed.blocks.map((b) => b.key)).toContain('t/n6');
  });

  it('gallery: two sequences of 4 to 8 steps that fit 480 by 480', () => {
    expect(samples.length).toBeGreaterThanOrEqual(2);
    for (const s of samples) {
      expect(s.scenes.length).toBeGreaterThanOrEqual(4);
      expect(s.scenes.length).toBeLessThanOrEqual(8);
      const { bounds } = composeLesson(s.scenes);
      expect(bounds.w).toBeLessThanOrEqual(480);
      expect(bounds.h).toBeLessThanOrEqual(480);
    }
  });
});
