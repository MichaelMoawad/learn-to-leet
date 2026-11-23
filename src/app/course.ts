// Course-order helpers shared by Home, the lesson header, the drawer and the recap.
import { allLessonSlugs, getLesson, hasLesson, moduleForLesson } from '../content';
import type { Lesson, Module } from '../content/schema';

/** "longest-substring-without-repeating-characters" -> "Longest Substring Without Repeating Characters". */
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

export function lessonTitle(slug: string): string {
  return getLesson(slug)?.title ?? titleFromSlug(slug);
}

/** The next authored lesson after `slug` in course order, if any. */
export function nextAvailableLesson(slug: string): Lesson | undefined {
  const i = allLessonSlugs.indexOf(slug);
  for (let j = i + 1; j < allLessonSlugs.length; j++) {
    if (hasLesson(allLessonSlugs[j])) return getLesson(allLessonSlugs[j]);
  }
  return undefined;
}

/** "Arrays and Hashing", 1, 2 for "lesson 1 of 2" in the header. */
export function lessonPosition(slug: string): { module?: Module; n: number; of: number } {
  const module = moduleForLesson(slug);
  if (!module) return { n: 0, of: 0 };
  return { module, n: module.lessons.indexOf(slug) + 1, of: module.lessons.length };
}

export const lessonPath = (slug: string, step?: number) => (step && step > 1 ? `/learn/${slug}?step=${step}` : `/learn/${slug}`);
