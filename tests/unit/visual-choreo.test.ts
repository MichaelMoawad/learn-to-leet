import { describe, expect, it } from 'vitest';
import type { Scene } from '../../src/content/schema';
import twoSum from '../../src/content/lessons/two-sum';
import { scenesForLesson } from '../../src/lesson/scenes';
import { arcPoint, planChoreo, TIMING } from '../../src/visual/choreo';
import { composeLesson, composeScene } from '../../src/visual/compose';
import { leetPose } from '../../src/visual/leet';
import gridSamples from '../../src/visual/samples/grid';

const scenes = scenesForLesson(twoSum);
const lesson = composeLesson(scenes);
const plan = (to: number) => planChoreo(scenes[to - 1], lesson.scenes[to - 1], scenes[to], lesson.scenes[to]);

describe('choreography diff on Two Sum', () => {
  it('step 4: 6 flies from nums[0] into the new key, 0 from index label 0 into its value', () => {
    const p = plan(3);
    expect(p.flights.map((f) => [f.text, f.target])).toEqual([
      ['6', 'seen/6'],
      ['0', 'seen/6#value'],
    ]);
    const nums0 = lesson.scenes[3].blocks.find((b) => b.key === 'nums/0')!;
    const label0 = lesson.scenes[3].labels.find((l) => l.key === 'nums/#i0')!;
    expect(p.flights[0].from[0]).toBeCloseTo((nums0.x - nums0.y) * 32, 5);
    expect(p.flights[1].from).toEqual([(label0.x - label0.y) * 32, (label0.x + label0.y) * 16]);
    // The new blocks wait for their token, the key lands first.
    expect(p.appear['seen/6']).toBeLessThan(p.appear['seen/6#value']);
    expect(p.appear['seen/6']).toBeGreaterThan(p.flights[0].start);
  });

  it('step 4: need = 5 is not in the map, so the map flashes a miss before the store', () => {
    const p = plan(3);
    expect(p.misses.map((m) => m.sid)).toEqual(['seen']);
    expect(p.misses[0].start).toBeLessThan(p.flights[0].start);
  });

  it('step 5: the pointer slides first, then the miss, then 2 and 1 fly', () => {
    const p = plan(4);
    expect(p.flights.map((f) => [f.text, f.target])).toEqual([
      ['2', 'seen/2'],
      ['1', 'seen/2#value'],
    ]);
    expect(p.misses[0].start).toBe(TIMING.slide);
    expect(p.flights[0].start).toBe(TIMING.slide + TIMING.lookupGap);
  });

  it('step 7: the lookup hits, pulsing seen/2 and the newly good cells, nothing flies', () => {
    const p = plan(6);
    expect(p.flights).toEqual([]);
    expect(p.misses).toEqual([]);
    expect(p.pulses.map((x) => [x.target, x.tone]).sort()).toEqual([
      ['nums/1', 'good'],
      ['nums/3', 'good'],
      ['seen/2', 'good'],
    ]);
  });

  it('step 2: tone changes to compare pulse', () => {
    const p = plan(1);
    expect(p.pulses.map((x) => x.target).sort()).toEqual(['nums/0', 'nums/1']);
  });

  it('runs roughly 0.8 to 1.6 seconds for the walkthrough steps', () => {
    for (const to of [3, 4, 5, 6]) {
      const p = plan(to);
      expect(p.total).toBeGreaterThan(800);
      expect(p.total).toBeLessThan(1600);
    }
  });

  it('Leet cheers on the step that finds the answer and the steps repeating it, not before', () => {
    expect(scenes.map((_, i) => leetPose(scenes, i))).toEqual(['idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'cheer', 'cheer', 'cheer']);
  });
});

describe('Leet pose rule', () => {
  const s = (tone?: 'good' | 'active', extra: Partial<Scene> = {}): Scene => ({ structures: [{ kind: 'array', id: 'a', cells: [{ value: 1, tone }] }], ...extra });

  it('cheers only on the last distinct scene, and only when it has a good var or cell', () => {
    const goodVar: Scene = { structures: [], vars: [{ name: 'x', value: 1, tone: 'good' }] };
    expect([goodVar, s(), s('good')].map((_, i, all) => leetPose(all, i))).toEqual(['idle', 'idle', 'cheer']);
    expect([s('good'), s('active')].map((_, i, all) => leetPose(all, i))).toEqual(['idle', 'idle']);
    expect([s(), goodVar].map((_, i, all) => leetPose(all, i))).toEqual(['idle', 'cheer']);
  });

  it('treats trailing steps that repeat the final picture as the final scene (captions ignored)', () => {
    const all = [s(), s('good', { caption: 'found' }), s('good', { caption: 'recap' })];
    expect(all.map((_, i) => leetPose(all, i))).toEqual(['idle', 'cheer', 'cheer']);
  });

  it('lets an explicit pose win anywhere', () => {
    const all = [s(undefined, { leet: { pose: 'cheer' } }), s('good', { leet: { pose: 'oops' } })];
    expect(all.map((_, i) => leetPose(all, i))).toEqual(['cheer', 'oops']);
    expect(leetPose(all, -1)).toBe('idle');
  });

  it('flood fill sample: no cheer until its last step', () => {
    const flood = gridSamples.find((x) => x.title.startsWith('Flood fill'))!.scenes;
    const poses = flood.map((_, i) => leetPose(flood, i));
    expect(poses.slice(0, -1).every((p) => p === 'idle')).toBe(true);
    expect(poses[poses.length - 1]).toBe('cheer');
  });
});

describe('choreography rules', () => {
  const arr = (tone?: 'active' | 'compare') => ({ kind: 'array' as const, id: 'a', cells: [{ value: 7, tone }] });

  it('only flies from active or compare sources in another structure', () => {
    const prev: Scene = { structures: [arr('active')] };
    const next: Scene = { structures: [arr(), { kind: 'hashmap', id: 's', entries: [{ key: 7 }] }] };
    expect(planChoreo(prev, composeScene(prev), next, composeScene(next)).flights).toEqual([]);
    const hot: Scene = { structures: [arr('compare'), { kind: 'hashmap', id: 's', entries: [{ key: 7 }] }] };
    const p = planChoreo(prev, composeScene(prev), hot, composeScene(hot));
    expect(p.flights.map((f) => [f.target, f.tone])).toEqual([['s/7', 'compare']]);
  });

  it('a lookup var only pulses keys that already existed, and only when it changed', () => {
    const map = (tone?: 'good') => ({ kind: 'hashmap' as const, id: 'm', entries: [{ key: 3, value: 1, tone }] });
    const a: Scene = { structures: [map()], vars: [{ name: 'need', value: 9, tone: 'bad' }] };
    const b: Scene = { structures: [map()], vars: [{ name: 'need', value: 3, tone: 'active' }] };
    const p = planChoreo(a, composeScene(a), b, composeScene(b));
    expect(p.pulses.map((x) => [x.target, x.tone])).toEqual([['m/3', 'active']]);
    const same = planChoreo(b, composeScene(b), b, composeScene(b));
    expect(same.pulses).toEqual([]);
    expect(same.flights).toEqual([]);
  });

  it('a one-shot flow flies once, looping flows do not', () => {
    const s: Scene = {
      structures: [{ kind: 'array', id: 'a', cells: [1, 2] }],
      flows: [{ from: 'a/0', to: 'a/1', loop: false }, { from: 'a/1', to: 'a/0' }],
    };
    const p = planChoreo(null, null, s, composeScene(s));
    expect(p.flights).toHaveLength(1);
    expect(p.flights[0].target).toBeUndefined();
  });

  it('arcs peak above both endpoints', () => {
    const from: [number, number] = [0, 0];
    const to: [number, number] = [100, 50];
    expect(arcPoint(from, to, 0)).toEqual(from);
    expect(arcPoint(from, to, 1)).toEqual(to);
    expect(arcPoint(from, to, 0.5)[1]).toBeLessThan(0);
  });
});
