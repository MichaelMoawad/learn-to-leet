import { describe, expect, it } from 'vitest';
import type { Scene } from '../../src/content/schema';
import twoSum from '../../src/content/lessons/two-sum';
import { scenesForLesson } from '../../src/lesson/scenes';
import { project } from '../../src/visual/iso';
import { composeLesson, composeScene, depthCompare, elementKey, snapToLattice } from '../../src/visual/compose';
import { leetRect, overlaps, blockRect, markerRect, labelRect } from '../../src/visual/metrics';

const onLattice = (dx: number, dy: number) => Number.isInteger(dx) && Number.isInteger(dy);

describe('key rule', () => {
  it('is structure id, slash, element id', () => {
    expect(elementKey('nums', '3')).toBe('nums/3');
    const c = composeScene({
      structures: [
        { kind: 'array', id: 'nums', cells: [1, { id: 'x', value: 2 }], pointers: [{ id: 'i', at: 0 }] },
        { kind: 'hashmap', id: 'seen', entries: [{ key: 6, value: 0 }] },
      ],
    });
    expect(c.blocks.map((b) => b.key).sort()).toEqual(['nums/0', 'nums/x', 'seen/6', 'seen/6#value']);
    expect(c.markers[0]).toMatchObject({ key: 'nums/@i', for: 'nums/0' });
  });
});

describe('snapToLattice', () => {
  it('returns whole-tile offsets whose screen shift is near the request', () => {
    for (const [tx, ty] of [[0, 0], [13, 7], [-50, 90], [100, -33], [31.9, 15.9]]) {
      const [dx, dy] = snapToLattice(tx, ty);
      expect(onLattice(dx, dy)).toBe(true);
      const [sx, sy] = project(dx, dy);
      expect(Math.abs(sx - tx)).toBeLessThanOrEqual(32);
      expect(Math.abs(sy - ty)).toBeLessThanOrEqual(16);
    }
  });

  it('never moves up or left when asked not to', () => {
    for (const [tx, ty] of [[13, 7], [-50, 91], [100, -33]]) {
      const [dx, dy] = snapToLattice(tx, ty, { minX: true, minY: true });
      const [sx, sy] = project(dx, dy);
      expect(sx).toBeGreaterThanOrEqual(tx);
      expect(sy).toBeGreaterThanOrEqual(ty);
    }
  });
});

describe('composeScene', () => {
  const twoRows: Scene = {
    structures: [
      { kind: 'array', id: 'a', label: 'a', cells: [1, 2, 3, 4, 5] },
      { kind: 'hashmap', id: 'm', label: 'm', entries: [{ key: 1, value: 0 }, { key: 2, value: 1 }] },
    ],
  };

  it('snaps every structure offset to the tile lattice', () => {
    const c = composeScene(twoRows);
    for (const s of c.structures) expect(onLattice(...s.offset)).toBe(true);
    for (const b of c.blocks.filter((b) => b.sid === 'a')) expect(Number.isInteger(b.x) && Number.isInteger(b.y)).toBe(true);
  });

  it('stacks structures below each other with at least a 24px gap and no overlaps', () => {
    const c = composeScene(twoRows);
    const rects = (sid: string) => [
      ...c.blocks.filter((b) => b.sid === sid).map(blockRect),
      ...c.labels.filter((l) => l.sid === sid).map(labelRect),
    ];
    for (const a of rects('a')) for (const m of rects('m')) expect(overlaps(a, m, 23)).toBe(false);
    expect(c.structures[1].box.y).toBeGreaterThan(c.structures[0].box.y);
  });

  it('puts a beside structure to the right, bottom-aligned', () => {
    const c = composeScene({
      structures: [
        { kind: 'array', id: 'a', cells: [1, 2, 3] },
        { kind: 'stack', id: 's', beside: true, items: [1, 2, 3] },
      ],
    });
    const [a, s] = c.structures;
    expect(s.box.x).toBeGreaterThanOrEqual(a.box.x + a.box.w + 32);
    expect(Math.abs(s.box.y + s.box.h - (a.box.y + a.box.h))).toBeLessThanOrEqual(16);
    expect(onLattice(...s.offset)).toBe(true);
  });

  it('sorts blocks back to front by x + y, then z', () => {
    const c = composeScene({
      structures: [
        { kind: 'stack', id: 's', items: [1, 2, 3] },
        { kind: 'hashmap', id: 'm', entries: [{ key: 1, value: 2 }, { key: 3, value: 4 }] },
      ],
    });
    for (let i = 1; i < c.blocks.length; i++) expect(depthCompare(c.blocks[i - 1], c.blocks[i])).toBeLessThan(0);
    const stack = c.blocks.filter((b) => b.sid === 's');
    expect(stack.map((b) => b.z)).toEqual([0, 1.5, 3]);
  });

  it('depth compare orders by x + y before z', () => {
    const a = { x: 0, y: 0, z: 3, key: 'a' };
    const b = { x: 1, y: 0, z: 0, key: 'b' };
    const c = { x: 0, y: 1, z: 0, key: 'c' };
    expect([b, c, a].sort(depthCompare).map((v) => v.key)).toEqual(['a', 'b', 'c']);
  });

  it('puts Leet in the lane just behind the pointer cell', () => {
    const c = composeScene({ structures: [{ kind: 'array', id: 'a', cells: [1, 2, 3, 4, 5], pointers: [{ id: 'i', at: 1 }] }] });
    const cell = c.blocks.find((b) => b.key === 'a/1')!;
    expect([c.leet!.tx - cell.x, c.leet!.ty - cell.y]).toEqual([0, -2]);
  });

  it('places Leet beside the first pointer target, fully visible (touching nothing)', () => {
    const c = composeScene({
      structures: [{ kind: 'array', id: 'a', label: 'nums', cells: [1, 2, 3, 4], pointers: [{ id: 'i', at: 2 }, { id: 'j', at: 3 }] }],
    });
    expect(c.leet?.anchor).toBe('a/2');
    const r = leetRect(c.leet!.sx, c.leet!.sy);
    for (const o of [...c.blocks.map(blockRect), ...c.markers.map(markerRect), ...c.labels.map(labelRect)]) expect(overlaps(r, o)).toBe(false);
    expect(Number.isInteger(c.leet!.tx) && Number.isInteger(c.leet!.ty)).toBe(true);
  });

  it('honours leet overrides', () => {
    const base = { structures: [{ kind: 'array' as const, id: 'a', cells: [1, 2, { value: 3, tone: 'active' as const }] }] };
    expect(composeScene(base).leet?.anchor).toBe('a/2');
    expect(composeScene({ ...base, leet: { at: 'a/0' } }).leet?.anchor).toBe('a/0');
    expect(composeScene({ ...base, leet: { hidden: true } }).leet).toBeNull();
  });

  it('resolves flows between element keys and drops unknown ones', () => {
    const c = composeScene({
      structures: [{ kind: 'array', id: 'a', cells: [1, 2] }],
      flows: [{ from: 'a/0', to: 'a/1' }, { from: 'a/0', to: 'nope/1' }],
    });
    expect(c.flows).toHaveLength(1);
    expect(c.flows[0]).toMatchObject({ loop: true, tone: 'active' });
  });
});

describe('composeLesson', () => {
  const lesson = composeLesson(scenesForLesson(twoSum));

  it('keeps each structure in the same place on every step', () => {
    const offsets = new Map<string, string>();
    for (const s of lesson.scenes) {
      for (const st of s.structures) {
        const o = st.offset.join();
        if (offsets.has(st.id)) expect(o).toBe(offsets.get(st.id));
        else offsets.set(st.id, o);
      }
    }
  });

  it('fits Two Sum, Leet included, in 480 by 480', () => {
    expect(lesson.bounds.w).toBeLessThanOrEqual(480);
    expect(lesson.bounds.h).toBeLessThanOrEqual(480);
    for (const s of lesson.scenes) {
      const r = leetRect(s.leet!.sx, s.leet!.sy);
      expect(r.x).toBeGreaterThanOrEqual(lesson.bounds.x);
      expect(r.x + r.w).toBeLessThanOrEqual(lesson.bounds.x + lesson.bounds.w);
    }
  });

  it('collects the tones the lesson uses', () => {
    expect(new Set(lesson.tones)).toEqual(new Set(['idle', 'good', 'compare', 'active', 'visited']));
  });

  it('reports bounds that exceed 480 for oversized scenes', () => {
    const big = composeLesson([
      {
        structures: [
          { kind: 'array', id: 'a', cells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
          { kind: 'hashmap', id: 'm', entries: [1, 2, 3, 4, 5, 6, 7, 8].map((key) => ({ key, value: key })) },
          { kind: 'array', id: 'b', cells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        ],
      },
    ]);
    expect(Math.max(big.bounds.w, big.bounds.h)).toBeGreaterThan(480);
  });
});
