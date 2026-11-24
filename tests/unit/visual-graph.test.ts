import { describe, expect, it } from 'vitest';
import type { GraphStructure } from '../../src/content/schema';
import { composeLesson } from '../../src/visual/compose';
import { project, ZU } from '../../src/visual/iso';
import { blockCentre, COL_PX, layoutGraph, ROW_PX, silhouetteExit, TRIM } from '../../src/visual/layout/graph';
import samples from '../../src/visual/samples/graph';

const G: GraphStructure = {
  kind: 'graph',
  id: 'g',
  directed: true,
  nodes: [
    { id: 'a', at: [0, 0] },
    { id: 'b', value: 7, at: [2, 0] },
    { id: 'c', at: [1, 2], tone: 'active' },
  ],
  edges: [
    { from: 'a', to: 'b', tone: 'good', label: 'w3' },
    { from: 'b', to: 'a' },
    { from: 'a', to: 'c' },
    { from: 'a', to: 'zz' },
  ],
  pointers: [{ id: 'u', at: 'c' }, { id: 'v', at: 0 }],
};
const dist = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);

describe('graph layout', () => {
  it('places nodes at `at` times (96, 64) on screen, value defaulting to the id', () => {
    const r = layoutGraph(G);
    const c = Object.fromEntries(r.blocks.map((b) => [b.key, blockCentre(b).map(Math.round)]));
    expect(c).toEqual({ a: [0, 0], b: [2 * COL_PX, 0], c: [COL_PX, 2 * ROW_PX] });
    expect(r.blocks.map((b) => b.text)).toEqual(['a', '7', 'c']);
  });

  it('draws straight trimmed edges with arrowheads when directed, labels and tones', () => {
    const r = layoutGraph(G);
    expect(r.edges.map((e) => e.key)).toEqual(['a>b', 'b>a', 'a>c']);
    const ab = r.edges[0];
    expect(ab).toMatchObject({ arrow: true, tone: 'good', label: 'w3' });
    expect(ab.points).toHaveLength(2);
    const byKey = new Map(r.blocks.map((b) => [b.key, b]));
    for (const e of r.edges) {
      const [from, to] = e.key.split('>');
      const p0 = project(...e.points[0]);
      const p1 = project(...e.points[1]);
      expect(dist(p0, blockCentre(byKey.get(from)!))).toBeGreaterThanOrEqual(TRIM - 0.5);
      expect(dist(p1, blockCentre(byKey.get(to)!))).toBeGreaterThanOrEqual(TRIM - 0.5);
    }
    // The pair a>b, b>a is offset sideways so the two lines do not overlap.
    const ba = r.edges[1];
    expect(Math.abs(project(...ab.points[0])[1] - project(...ba.points[1])[1])).toBeGreaterThan(8);
  });

  it('pulls arrowheads out from under the target silhouette (more than 20px when arriving from above)', () => {
    const r = layoutGraph(G);
    const ac = r.edges.find((e) => e.key === 'a>c')!;
    const c = r.blocks.find((b) => b.key === 'c')!;
    const tip = project(...ac.points[1]);
    const centre = blockCentre(c);
    const u: [number, number] = [(centre[0] - tip[0]) / dist(tip, centre), (centre[1] - tip[1]) / dist(tip, centre)];
    expect(dist(tip, centre)).toBeGreaterThan(silhouetteExit(c, -u[0], -u[1]));
    expect(dist(tip, centre)).toBeGreaterThan(TRIM + 5);
  });

  it('measures the silhouette: footprint below, top face above', () => {
    const b = { z: 0, h: 1 };
    expect(silhouetteExit(b, 0, 1)).toBeCloseTo(14, 0);
    expect(silhouetteExit(b, 0, -1)).toBeCloseTo(14 + ZU, 0);
    expect(silhouetteExit(b, 1, 0)).toBeCloseTo(28, 0);
  });

  it('undirected edges have no arrowheads; pointers resolve by id or index', () => {
    const r = layoutGraph({ ...G, directed: false });
    expect(r.edges.every((e) => !e.arrow)).toBe(true);
    expect(r.markers.map((m) => [m.key, m.for])).toEqual([['@u', 'c'], ['@v', 'a']]);
  });

  it('gallery: two sequences of 4 to 8 steps that fit 480 by 480, the directed one with changing edge tones', () => {
    expect(samples.length).toBeGreaterThanOrEqual(2);
    for (const s of samples) {
      expect(s.scenes.length).toBeGreaterThanOrEqual(4);
      expect(s.scenes.length).toBeLessThanOrEqual(8);
      const { bounds } = composeLesson(s.scenes);
      expect(bounds.w).toBeLessThanOrEqual(480);
      expect(bounds.h).toBeLessThanOrEqual(480);
    }
    const tones = new Set(samples[0].scenes.flatMap((sc) => (sc.structures[0] as GraphStructure).edges.map((e) => e.tone)));
    expect(tones.size).toBeGreaterThanOrEqual(3);
    expect((samples[0].scenes[0].structures[0] as GraphStructure).directed).toBe(true);
  });
});
