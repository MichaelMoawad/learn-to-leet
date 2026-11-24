import { describe, expect, it } from 'vitest';
import type { LinkedListStructure } from '../../src/content/schema';
import { composeLesson, composeScene } from '../../src/visual/compose';
import { LIFT, project } from '../../src/visual/iso';
import { ARROW_Y, LANE_Y, layoutLinkedList } from '../../src/visual/layout/linkedList';
import samples from '../../src/visual/samples/linkedList';

const list = (nodes: LinkedListStructure['nodes'], extra: Partial<LinkedListStructure> = {}): LinkedListStructure => ({ kind: 'linkedList', id: 'l', nodes, ...extra });
const abc = (next: Partial<Record<string, string | null>> = {}) =>
  list(['a', 'b', 'c'].map((id, i) => ({ id, value: i + 1, ...(id in next ? { next: next[id] } : {}) })));

describe('linkedList layout', () => {
  it('puts nodes on every second tile along x, keyed by node id', () => {
    const r = layoutLinkedList(abc());
    expect(r.blocks.map((b) => [b.key, b.x, b.y, b.h, b.text])).toEqual([
      ['a', 0, 0, 1, '1'],
      ['b', 2, 0, 1, '2'],
      ['c', 4, 0, 1, '3'],
    ]);
  });

  it('draws default next as short forward floor arrows across the gap, clear of the next block', () => {
    const r = layoutLinkedList(abc());
    const ab = r.edges.find((e) => e.key === 'a>b')!;
    expect(ab.arrow).toBe(true);
    const [[x0, y0], [x1, y1]] = ab.points;
    expect([y0, y1]).toEqual([ARROW_Y, ARROW_Y]);
    expect(x0).toBeGreaterThan(0.9); // leaves a's right face
    expect(x1).toBeLessThan(2); // stops before b's tile
    // The tip is left of b's silhouette on screen (b's left vertex is 28px left of its tile top).
    expect(project(x1, y1)[0]).toBeLessThan(project(2, 0)[0] - 28);
    expect(project(x1, y1)[0] - project(x0, y0)[0]).toBeGreaterThan(20);
  });

  it('ends the list with a null stub and a cross', () => {
    const r = layoutLinkedList(abc());
    const stub = r.edges.find((e) => e.key === 'c>null')!;
    expect(stub.arrow).toBe(false);
    expect(stub.points[1][0]).toBeGreaterThan(stub.points[0][0]);
    expect(stub.cap).toBe('cross');
    expect(r.labels.some((l) => l.key === 'c#null')).toBe(false);
  });

  it('points a mid-list null stub down toward the lane, not at the next node', () => {
    const r = layoutLinkedList(abc({ a: null }));
    const stub = r.edges.find((e) => e.key === 'a>null')!;
    expect(stub.points[0][0]).toBeCloseTo(stub.points[1][0]);
    expect(stub.points[1][1]).toBeGreaterThan(stub.points[0][1]);
    expect(r.edges.some((e) => e.key === 'a>b')).toBe(false);
  });

  it('routes a backward next along the front lane as an arc into the target front face', () => {
    const r = layoutLinkedList(abc({ b: 'a', c: 'b' }));
    const ba = r.edges.find((e) => e.key === 'b>a')!;
    expect(ba.arrow).toBe(true);
    const ys = ba.points.map((p) => p[1]);
    expect(Math.max(...ys)).toBeCloseTo(LANE_Y);
    expect(ys[0]).toBeGreaterThan(0.94); // starts in front of b
    expect(ys[ys.length - 1]).toBeGreaterThan(0.94); // ends in front of a
    expect(ba.points[0][0]).toBeGreaterThan(2); // leaves b (x 2..3)
    expect(ba.points[0][0]).toBeLessThan(3);
    const end = ba.points[ba.points.length - 1];
    expect(end[0]).toBeGreaterThan(0);
    expect(end[0]).toBeLessThan(1); // arrives at a (x 0..1)
    // last segment points back up (-y) into a
    const prev = ba.points[ba.points.length - 2];
    expect(end[1]).toBeLessThan(prev[1]);
    // in and out ports at b do not overlap
    const cb = r.edges.find((e) => e.key === 'c>b')!;
    expect(Math.abs(cb.points[cb.points.length - 1][0] - ba.points[0][0])).toBeGreaterThan(0.3);
  });

  it('routes a forward skip along the lane too, and gives overlapping spans deeper lanes', () => {
    const r = layoutLinkedList(list(['a', 'b', 'c', 'd'].map((id, i) => ({ id, value: i, next: ({ a: 'c', b: 'd' } as Record<string, string>)[id] }))));
    const ac = r.edges.find((e) => e.key === 'a>c')!;
    const bd = r.edges.find((e) => e.key === 'b>d')!;
    const depth = (e: typeof ac) => Math.max(...e.points.map((p) => p[1]));
    expect(depth(ac)).toBeCloseTo(LANE_Y);
    expect(depth(bd)).toBeGreaterThan(LANE_Y + 0.3);
  });

  it('places pointers above nodes by id or index, stacking on one node', () => {
    const r = layoutLinkedList({ ...abc(), pointers: [{ id: 'slow', at: 'b' }, { id: 'fast', at: 1 }, { id: 'p', at: 'zz' }] });
    expect(r.markers.map((m) => [m.key, m.x, m.for])).toEqual([
      ['@slow', 2.5, 'b'],
      ['@fast', 2.5, 'b'],
    ]);
    expect(r.markers[1].z).toBeGreaterThan(r.markers[0].z);
  });

  it('lifts active nodes and prefixes keys through compose', () => {
    const s = list([{ id: 'a', value: 1, tone: 'active' }, { id: 'b', value: 2 }]);
    expect(layoutLinkedList(s).blocks[0].z).toBe(LIFT);
    const c = composeScene({ structures: [s] });
    expect(c.blocks.map((b) => b.key).sort()).toEqual(['l/a', 'l/b']);
    expect(c.edges.map((e) => e.key).sort()).toEqual(['l/a>b', 'l/b>null']);
  });

  it('gallery: two sequences of 4 to 8 steps that fit 480 by 480, the reversal rewiring backward', () => {
    expect(samples.length).toBeGreaterThanOrEqual(2);
    for (const s of samples) {
      expect(s.scenes.length).toBeGreaterThanOrEqual(4);
      expect(s.scenes.length).toBeLessThanOrEqual(8);
      const { bounds } = composeLesson(s.scenes);
      expect(bounds.w).toBeLessThanOrEqual(480);
      expect(bounds.h).toBeLessThanOrEqual(480);
    }
    const last = layoutLinkedList(samples[0].scenes[samples[0].scenes.length - 1].structures[0] as LinkedListStructure);
    expect(last.edges.filter((e) => e.arrow && Math.max(...e.points.map((p) => p[1])) > 1.4).length).toBe(4);
  });
});
