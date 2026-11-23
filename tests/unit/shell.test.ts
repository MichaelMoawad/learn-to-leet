import { describe, expect, it } from 'vitest';
import { getLesson } from '../../src/content';
import { lessonPosition, nextAvailableLesson, titleFromSlug } from '../../src/app/course';
import { isReducedMotion, nextMotionPref } from '../../src/app/useReducedMotion';
import { scenesForLesson } from '../../src/lesson/scenes';
import { stepFromSearch } from '../../src/lesson/keys';

describe('stepFromSearch', () => {
  it('parses a 1-based step into a 0-based index', () => {
    expect(stepFromSearch('?step=3', 9)).toBe(2);
    expect(stepFromSearch('?step=1', 9)).toBe(0);
    expect(stepFromSearch('?step=9', 9)).toBe(8);
  });
  it('rejects missing, out of range and junk values', () => {
    expect(stepFromSearch('', 9)).toBeNull();
    expect(stepFromSearch('?step=0', 9)).toBeNull();
    expect(stepFromSearch('?step=10', 9)).toBeNull();
    expect(stepFromSearch('?step=2.5', 9)).toBeNull();
    expect(stepFromSearch('?step=abc', 9)).toBeNull();
  });
});

describe('isReducedMotion', () => {
  it('follows the pref, and the OS only when auto', () => {
    expect(isReducedMotion('reduced', false)).toBe(true);
    expect(isReducedMotion('full', true)).toBe(false);
    expect(isReducedMotion('auto', true)).toBe(true);
    expect(isReducedMotion('auto', false)).toBe(false);
  });
  it('cycles auto, reduced, full', () => {
    expect(nextMotionPref.auto).toBe('reduced');
    expect(nextMotionPref.reduced).toBe('full');
    expect(nextMotionPref.full).toBe('auto');
  });
});

describe('scenesForLesson', () => {
  it('gives every step a scene, repeating the previous one for challenge and scene-less recap', () => {
    const lesson = getLesson('two-sum')!;
    const scenes = scenesForLesson(lesson);
    expect(scenes).toHaveLength(lesson.steps.length);
    const ci = lesson.steps.findIndex((s) => s.kind === 'challenge');
    expect(scenes[ci]).toBe(scenes[ci - 1]);
    const last = lesson.steps.at(-1)!;
    if (last.kind === 'recap' && !last.scene) expect(scenes.at(-1)).toBe(scenes.at(-2));
    lesson.steps.forEach((s, i) => {
      if (s.kind === 'concept') expect(scenes[i]).toBe(s.scene);
    });
  });
});

describe('course helpers', () => {
  it('titles unauthored slugs', () => {
    expect(titleFromSlug('middle-of-the-linked-list')).toBe('Middle of the Linked List');
    expect(titleFromSlug('two-sum')).toBe('Two Sum');
  });
  it('places a lesson in its module', () => {
    const pos = lessonPosition('two-sum');
    expect(pos.module?.slug).toBe('arrays-and-hashing');
    expect(pos.n).toBe(1);
    expect(pos.of).toBeGreaterThanOrEqual(1);
  });
  it('only offers authored lessons as next', () => {
    const next = nextAvailableLesson('two-sum');
    if (next) expect(getLesson(next.slug)).toBe(next);
  });
});
