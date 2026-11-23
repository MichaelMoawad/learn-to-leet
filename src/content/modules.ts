import type { Module } from './schema';

export const modules: Module[] = [
  {
    slug: 'arrays-and-hashing',
    title: 'Arrays and Hashing',
    blurb: 'Trade a little memory for speed by remembering what you have already seen.',
    icon: 'hash',
    lessons: ['two-sum', 'group-anagrams'],
  },
  {
    slug: 'two-pointers-and-sliding-window',
    title: 'Two Pointers and Sliding Window',
    blurb: 'Move two markers through a list so every element gets looked at only a few times.',
    icon: 'pointers',
    lessons: ['valid-palindrome', 'container-with-most-water', 'longest-substring-without-repeating-characters'],
  },
  {
    slug: 'stacks',
    title: 'Stacks',
    blurb: 'Keep the most recent unfinished item on top and resolve it the moment its match arrives.',
    icon: 'stack',
    lessons: ['valid-parentheses', 'daily-temperatures'],
  },
  {
    slug: 'binary-search',
    title: 'Binary Search',
    blurb: 'Throw away half of a sorted range with every single comparison.',
    icon: 'search',
    lessons: ['binary-search'],
  },
  {
    slug: 'linked-lists',
    title: 'Linked Lists',
    blurb: 'Walk and rewire chains of nodes one pointer at a time.',
    icon: 'list',
    lessons: ['reverse-linked-list', 'middle-of-the-linked-list'],
  },
  {
    slug: 'trees',
    title: 'Trees',
    blurb: 'Explore branching data by going deep with recursion or wide with a queue.',
    icon: 'tree',
    lessons: ['maximum-depth-of-binary-tree', 'binary-tree-level-order-traversal'],
  },
  {
    slug: 'graphs-and-grids',
    title: 'Graphs and Grids',
    blurb: 'Spread out from a starting point and keep track of everywhere you have been.',
    icon: 'graph',
    lessons: ['number-of-islands', 'course-schedule'],
  },
  {
    slug: 'dynamic-programming',
    title: 'Dynamic Programming',
    blurb: 'Build big answers out of small ones you have already worked out.',
    icon: 'dp',
    lessons: ['climbing-stairs'],
  },
];

export const allLessonSlugs: string[] = modules.flatMap((m) => m.lessons);

export function getModule(slug: string): Module | undefined {
  return modules.find((m) => m.slug === slug);
}

export function moduleForLesson(lessonSlug: string): Module | undefined {
  return modules.find((m) => m.lessons.includes(lessonSlug));
}
