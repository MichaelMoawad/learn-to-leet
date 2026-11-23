import type { Lesson } from './schema';
import { allLessonSlugs } from './modules';

export { modules, allLessonSlugs, getModule, moduleForLesson } from './modules';

const files = import.meta.glob<{ default: Lesson }>('./lessons/*.ts', { eager: true });

/** Every authored lesson, keyed by slug. Slugs listed in modules.ts without a file are absent. */
export const lessons: Record<string, Lesson> = Object.fromEntries(
  Object.values(files).map((mod) => [mod.default.slug, mod.default]),
);

export function getLesson(slug: string): Lesson | undefined {
  return lessons[slug];
}

/** True when a lesson file exists for this slug. False means the card shows "Coming soon". */
export function hasLesson(slug: string): boolean {
  return slug in lessons;
}

/** Authored lessons in course order. */
export function availableLessons(): Lesson[] {
  return allLessonSlugs.filter(hasLesson).map((slug) => lessons[slug]);
}
