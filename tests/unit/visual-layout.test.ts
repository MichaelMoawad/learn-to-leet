import { describe, expect, it } from 'vitest';
import type { Structure } from '../../src/content/schema';
import { LIFT } from '../../src/visual/iso';
import { layoutStructure } from '../../src/visual/layout';
import { layoutArray } from '../../src/visual/layout/array';
import { ENTRY_PITCH, layoutHashmap, VALUE_H, VALUE_Y } from '../../src/visual/layout/hashmap';
import { DEFAULT_H } from '../../src/visual/layout/common';
import { layoutQueue } from '../../src/visual/layout/queue';
import { ITEM_H, layoutStack } from '../../src/visual/layout/stack';

describe('array layout', () => {
  it('puts cells along x at y = 0 with index labels in front', () => {
    const r = layoutArray({ kind: 'array', id: 'a', cells: [6, 2, 15] });
    expect(r.blocks.map((b) => [b.key, b.x, b.y, b.h, b.text])).toEqual([
      ['0', 0, 0, DEFAULT_H, '6'],
      ['1', 1, 0, DEFAULT_H, '2'],
      ['2', 2, 0, DEFAULT_H, '15'],
    ]);
    const idx = r.labels.filter((l) => l.kind === 'index');
    expect(idx.map((l) => [l.text, l.for])).toEqual([['0', '0'], ['1', '1'], ['2', '2']]);
    expect(idx.every((l) => l.y > 1)).toBe(true);
  });

  it('uses cell ids as element ids and can hide indices', () => {
    const r = layoutArray({ kind: 'array', id: 'a', cells: [{ id: 'x', value: 1 }, 2], indices: false });
    expect(r.blocks.map((b) => b.key)).toEqual(['x', '1']);
    expect(r.labels).toEqual([]);
  });

  it('applies tone rules: active floats LIFT, muted flattens', () => {
    const r = layoutArray({ kind: 'array', id: 'a', cells: [{ value: 1, tone: 'active' }, { value: 2, tone: 'muted' }, { value: 3, h: 2 }] });
    expect(r.blocks[0]).toMatchObject({ z: LIFT, h: DEFAULT_H, tone: 'active' });
    expect(r.blocks[1]).toMatchObject({ z: 0, h: 0.25, tone: 'muted' });
    expect(r.blocks[2]).toMatchObject({ z: 0, h: 2, tone: 'idle' });
  });

  it('stacks several pointers on one cell upward', () => {
    const r = layoutArray({ kind: 'array', id: 'a', cells: [1, 2, 3], pointers: [{ id: 'i', at: 1 }, { id: 'j', at: 1 }, { id: 'k', at: 2 }] });
    const [i, j, k] = r.markers;
    expect(i).toMatchObject({ key: '@i', x: 1.5, y: 0.5, for: '1' });
    expect(j.z).toBeGreaterThan(i.z + 2);
    expect(k).toMatchObject({ x: 2.5, z: i.z, for: '2' });
  });

  it('draws the window as a zone around the range', () => {
    const r = layoutArray({ kind: 'array', id: 'a', cells: [1, 2, 3, 4], window: [1, 2] });
    const z = r.zones[0];
    expect(z.key).toBe('#window');
    expect(z.x).toBeLessThan(1);
    expect(z.x + z.w).toBeGreaterThan(3);
    expect(z.x + z.w).toBeLessThan(3.5);
  });

  it('sets bar heights from values: 0.75 + 3.25 * v / max', () => {
    const r = layoutArray({ kind: 'array', id: 'a', variant: 'bars', cells: [0, 4, 8] });
    expect(r.blocks.map((b) => b.h)).toEqual([0.75, 2.375, 4]);
  });

  it('treats strings as one character per cell', () => {
    const r = layoutArray({ kind: 'array', id: 's', cells: 'abc'.split('') });
    expect(r.blocks.map((b) => b.text)).toEqual(['a', 'b', 'c']);
  });

  it('adds a title pill when labelled', () => {
    const r = layoutArray({ kind: 'array', id: 'a', label: 'nums', cells: [1] });
    expect(r.labels.find((l) => l.kind === 'title')?.text).toBe('nums');
  });
});

describe('hashmap layout', () => {
  it('draws each entry as a key block at the back and a shorter value block touching it in front', () => {
    const r = layoutHashmap({ kind: 'hashmap', id: 'm', entries: [{ key: 6, value: 0 }, { key: 2, value: 1, tone: 'good' }] });
    expect(r.blocks.map((b) => [b.key, b.x, b.y, b.h, b.text, b.role, b.tone])).toEqual([
      ['6', 0, 0, DEFAULT_H, '6', 'key', 'idle'],
      ['6#value', 0, VALUE_Y, VALUE_H, '0', 'value', 'idle'],
      ['2', ENTRY_PITCH, 0, DEFAULT_H, '2', 'key', 'good'],
      ['2#value', ENTRY_PITCH, VALUE_Y, VALUE_H, '1', 'value', 'good'],
    ]);
    expect(VALUE_H).toBeLessThan(DEFAULT_H);
    expect(ENTRY_PITCH).toBeGreaterThan(1); // the gap between entries beats the seam inside one
    expect(r.zones.find((z) => z.key === '#plate')?.style).toBe('plate');
  });

  it('draws empty slots up to the lesson-wide entry count and sizes the plate for them', () => {
    const r = layoutHashmap({ kind: 'hashmap', id: 'm', entries: [{ key: 6, value: 0 }] }, { slots: 3 });
    expect(r.zones.filter((z) => z.key.startsWith('#slot')).map((z) => [z.key, z.style])).toEqual([
      ['#slot1', 'outline'],
      ['#slot2', 'outline'],
    ]);
    const plate = r.zones.find((z) => z.key === '#plate')!;
    expect(plate.x + plate.w).toBeGreaterThan(2 * ENTRY_PITCH + 1);
  });

  it('draws a set as the key row only', () => {
    const r = layoutHashmap({ kind: 'hashmap', id: 's', entries: [{ key: 'a' }, { key: 'b' }] });
    expect(r.blocks.map((b) => [b.key, b.y])).toEqual([['a', 0], ['b', 0]]);
    expect(r.zones.find((z) => z.key === '#plate')?.d).toBe(1.5);
  });
});

describe('stack layout', () => {
  it('piles items on one tile along z with values on the side and a top marker', () => {
    const r = layoutStack({ kind: 'stack', id: 'st', items: ['(', { id: 'b', value: '[' }] });
    expect(r.blocks.map((b) => [b.key, b.x, b.y, b.z, b.h, b.textOn])).toEqual([
      ['0', 0, 0, 0, ITEM_H, 'side'],
      ['b', 0, 0, ITEM_H, ITEM_H, 'side'],
    ]);
    expect(r.markers[0]).toMatchObject({ key: '@top', text: 'top', for: 'b' });
    expect(r.markers[0].z).toBeGreaterThan(2 * ITEM_H);
  });

  it('does not float active items into the one above', () => {
    const r = layoutStack({ kind: 'stack', id: 'st', items: [{ value: 1, tone: 'active' }, 2] });
    expect(r.blocks[0].z).toBe(0);
  });
});

describe('queue layout', () => {
  it('is a row with front and back labels at the ends', () => {
    const r = layoutQueue({ kind: 'queue', id: 'q', items: [{ id: 'a', value: 'A' }, { id: 'b', value: 'B' }] });
    expect(r.blocks.map((b) => [b.key, b.x])).toEqual([['a', 0], ['b', 1]]);
    const front = r.labels.find((l) => l.text === 'front')!;
    const back = r.labels.find((l) => l.text === 'back')!;
    expect(front.x).toBeLessThan(0);
    expect(back.x).toBeGreaterThan(2);
  });
});

describe('layout dispatch', () => {
  it('routes every kind and returns empty results for the 3B stubs', () => {
    const kinds: Structure[] = [
      { kind: 'linkedList', id: 'l', nodes: [] },
      { kind: 'tree', id: 't', root: null, nodes: [] },
      { kind: 'graph', id: 'g', nodes: [], edges: [] },
      { kind: 'grid', id: 'g2', rows: [] },
    ];
    for (const s of kinds) expect(layoutStructure(s).blocks).toBeInstanceOf(Array);
    expect(layoutStructure({ kind: 'array', id: 'a', cells: [1] }).blocks).toHaveLength(1);
  });
});
