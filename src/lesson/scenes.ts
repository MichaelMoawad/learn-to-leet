import type { Lesson, Scene } from '../content/schema';

const EMPTY: Scene = { structures: [] };

/**
 * One scene per step, in order. Challenge steps and recap steps without a scene repeat the
 * previous scene (or the first concept scene when nothing came before).
 */
export function scenesForLesson(lesson: Lesson): Scene[] {
  const first = lesson.steps.find((s) => s.kind === 'concept');
  let prev: Scene = first && first.kind === 'concept' ? first.scene : EMPTY;
  return lesson.steps.map((step) => {
    if (step.kind === 'concept') prev = step.scene;
    else if (step.kind === 'recap' && step.scene) prev = step.scene;
    return prev;
  });
}
