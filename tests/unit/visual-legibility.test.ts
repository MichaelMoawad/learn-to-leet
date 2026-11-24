import { describe, expect, it } from 'vitest';
import type { Scene } from '../../src/content/schema';
import { composeLesson, composeScene } from '../../src/visual/compose';
import { layoutArray } from '../../src/visual/layout/array';
import { blockRect, labelRect, leetSpriteRect, markerRect, overlaps, titleBox } from '../../src/visual/metrics';

describe('marker pills on neighbouring cells (bug B)', () => {
  it('staggers pills whose boxes would overlap, deterministically', () => {
    const s = { kind: 'array' as const, id: 'a', cells: [1, 2, 3, 4, 5], pointers: [{ id: 'left', at: 2 }, { id: 'right', at: 3 }] };
    const r = layoutArray(s);
    const [a, b] = r.markers;
    expect(overlaps(markerRect(a), markerRect(b), -2)).toBe(false);
    expect(b.z).toBeGreaterThan(a.z);
    expect(layoutArray(s).markers).toEqual(r.markers);
  });

  it('leaves far-apart pointers at the base height', () => {
    const r = layoutArray({ kind: 'array', id: 'a', cells: [1, 2, 3, 4, 5], pointers: [{ id: 'i', at: 0 }, { id: 'j', at: 4 }] });
    expect(r.markers[0].z).toBe(r.markers[1].z);
  });
});

describe('title pill clears its blocks across the lesson (bug C)', () => {
  const bars = (cells: number[]): Scene => ({ structures: [{ kind: 'array', id: 't', label: 'temperatures', variant: 'bars', cells }] });
  const scenes = [bars([73, 74, 75, 71]), bars([30, 74, 75, 71]), bars([90, 10, 20, 30])];

  it('never overlaps a block and is the same on every step', () => {
    const lesson = composeLesson(scenes);
    const rises = new Set<number>();
    for (const c of lesson.scenes) {
      const title = c.labels.find((l) => l.kind === 'title')!;
      rises.add(title.rise ?? 0);
      const { box } = titleBox(title);
      for (const b of c.blocks) expect(overlaps(box, blockRect(b))).toBe(false);
      expect(labelRect(title).y).toBeGreaterThanOrEqual(lesson.bounds.y - 1e-6);
    }
    expect(rises.size).toBe(1);
    expect([...rises][0]).toBeGreaterThan(0);
  });

  it('does not lift a title that already clears the blocks', () => {
    const c = composeLesson([{ structures: [{ kind: 'array', id: 'a', label: 'nums', cells: [1, 2, 3] }] }]);
    expect(c.scenes[0].labels.find((l) => l.kind === 'title')!.rise ?? 0).toBe(0);
  });
});

describe('Leet is inside the lesson bounds (bug A)', () => {
  it('includes the whole sprite and shadow', () => {
    const scene: Scene = { structures: [{ kind: 'array', id: 'a', cells: [1, 1, 2, 3, 5, 8] }] };
    const c = composeScene(scene);
    const r = leetSpriteRect(c.leet!.sx, c.leet!.sy);
    expect(r.x).toBeGreaterThanOrEqual(c.bounds.x - 1e-6);
    expect(r.x + r.w).toBeLessThanOrEqual(c.bounds.x + c.bounds.w + 1e-6);
    expect(r.y + r.h).toBeLessThanOrEqual(c.bounds.y + c.bounds.h + 1e-6);
  });
});

describe('title pill clears pointer pills (bug C follow-up)', () => {
  it('is lifted above a marker on the first cell, the same on every step', () => {
    const mk = (pointers: { id: string; at: number }[]): Scene => ({ structures: [{ kind: 'array', id: 's', label: 's', cells: ['a', 'b', 'c'], pointers }] });
    const lesson = composeLesson([mk([]), mk([{ id: 'start', at: 0 }]), mk([{ id: 'left', at: 1 }])]);
    const rises = new Set(lesson.scenes.map((c) => c.labels.find((l) => l.kind === 'title')!.rise ?? 0));
    expect(rises.size).toBe(1);
    for (const c of lesson.scenes) {
      const { box } = titleBox(c.labels.find((l) => l.kind === 'title')!);
      for (const m of c.markers) expect(overlaps(box, markerRect(m))).toBe(false);
    }
  });
});
