import { describe, expect, it } from 'vitest';
import type { GridStructure } from '../../src/content/schema';
import { composeLesson, composeScene } from '../../src/visual/compose';
import { layoutGrid } from '../../src/visual/layout/grid';
import samples from '../../src/visual/samples/grid';

const G: GridStructure = {
  kind: 'grid',
  id: 'g',
  label: 'map',
  rows: [
    [1, { value: 0, h: 0 }],
    [{ id: 'x', value: 1, tone: 'muted' }, { value: 1, h: 2, sub: 'no' }],
  ],
  pointers: [{ id: 'p', at: [1, 1] }, { id: 'q', at: [1, 0] }, { id: 'out', at: [5, 5] }],
};

describe('grid layout', () => {
  it('puts cell (r, c) on tile (c, r) with h from the cell, keyed r,c or by id', () => {
    const r = layoutGrid(G);
    expect(r.blocks.map((b) => [b.key, b.x, b.y, b.h])).toEqual([
      ['0,0', 0, 0, 1],
      ['0,1', 1, 0, 0],
      ['x', 0, 1, 1],
      ['1,1', 1, 1, 2],
    ]);
  });

  it('never lifts active cells or flattens muted ones (tones only change colour)', () => {
    const r = layoutGrid({ kind: 'grid', id: 'g', rows: [[{ value: 1, tone: 'active' }, { value: 2, tone: 'muted', h: 1.5 }]] });
    expect(r.blocks.map((b) => [b.tone, b.z, b.h])).toEqual([
      ['active', 0, 1],
      ['muted', 0, 1.5],
    ]);
  });

  it('floats pointers above their cells', () => {
    const r = layoutGrid(G);
    expect(r.markers.map((m) => [m.key, m.x, m.y, m.for])).toEqual([
      ['@p', 1.5, 1.5, '1,1'],
      ['@q', 0.5, 1.5, 'x'],
    ]);
    expect(r.markers[0].z).toBeGreaterThan(2);
  });

  it('hangs the title below the front corner and draws no sub notes over the next row', () => {
    const c = composeScene({ structures: [G] });
    expect(c.labels.filter((l) => l.kind === 'note')).toHaveLength(0);
    const t = layoutGrid(G).labels.find((l) => l.key === '#title')!;
    expect(t).toMatchObject({ place: 'below', text: 'map' });
    expect(t.y).toBeGreaterThan(2);
    expect(t.x).toBeGreaterThan(2);
    expect(c.blocks.map((b) => b.key)).toContain('g/1,1');
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
