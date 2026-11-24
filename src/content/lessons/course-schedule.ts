import type { ArrayStructure, GraphStructure, Lesson, QueueStructure, Tone } from '../schema';

// Walkthrough: 6 courses. Arrows run from a prerequisite to the course that needs it.
const AT: Record<number, [number, number]> = { 0: [0, 0], 1: [0, 1], 2: [1, 0], 3: [1, 1], 4: [2, 0], 5: [2, 1] };
const EDGES: [number, number][] = [[0, 2], [0, 3], [1, 3], [2, 4], [3, 4], [3, 5]];
const START_INDEG = [0, 0, 1, 2, 2, 1];

const graph = (
  nodeTones: Partial<Record<number, Tone>> = {},
  edgeTones: Partial<Record<string, Tone>> = {},
): GraphStructure => ({
  kind: 'graph',
  id: 'graph',
  directed: true,
  nodes: [0, 1, 2, 3, 4, 5].map((n) => ({ id: `n${n}`, value: n, at: AT[n], tone: nodeTones[n] })),
  edges: EDGES.map(([from, to]) => ({ from: `n${from}`, to: `n${to}`, tone: edgeTones[`${from}-${to}`] })),
});

const indeg = (values: number[], tones: Partial<Record<number, Tone>> = {}): ArrayStructure => ({
  kind: 'array',
  id: 'indeg',
  label: 'indegree',
  cells: values.map((value, i) => ({ value, tone: tones[i] })),
});

const queue = (courses: number[], tones: Partial<Record<number, Tone>> = {}): QueueStructure => ({
  kind: 'queue',
  id: 'queue',
  label: 'queue',
  items: courses.map((c) => ({ id: `c${c}`, value: c, tone: tones[c] })),
});

// Cycle variant: 4 courses, 1 -> 2 -> 3 -> 1 forms a loop.
const CYCLE_AT: Record<number, [number, number]> = { 0: [0, 1], 1: [1, 0], 2: [2, 0], 3: [1, 1] };
const CYCLE_EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 1]];

const cycleGraph = (): GraphStructure => ({
  kind: 'graph',
  id: 'graph',
  directed: true,
  nodes: [0, 1, 2, 3].map((n) => ({
    id: `n${n}`,
    value: n,
    at: CYCLE_AT[n],
    tone: n === 0 ? 'visited' : 'bad',
  })),
  edges: CYCLE_EDGES.map(([from, to]) => ({
    from: `n${from}`,
    to: `n${to}`,
    tone: from === 0 ? undefined : 'bad',
  })),
});

const lesson: Lesson = {
  slug: 'course-schedule',
  title: 'Course Schedule',
  source: { leetcode: 207, name: 'Course Schedule' },
  pattern: 'Topological sort',
  difficulty: 'medium',
  minutes: 12,
  youllLearn: [
    'How to read prerequisite pairs as arrows in a directed graph',
    'What in-degree means and why zero is the green light',
    "Kahn's algorithm: peel off courses with a queue",
    'Why a cycle makes the queue run dry too early',
  ],

  problem: {
    statement: [
      'You must finish `numCourses` courses, numbered `0` to `numCourses - 1`. Some courses have prerequisites, given as pairs `[course, needs]`: you have to finish `needs` before you may start `course`.',
      'Return `true` if there is some order that lets you finish every course, and `false` otherwise.',
    ],
    examples: [
      {
        input: 'numCourses = 6, prerequisites = [[2, 0], [3, 0], [3, 1], [4, 2], [4, 3], [5, 3]]',
        output: 'true',
        note: 'One valid order is 0, 1, 2, 3, 4, 5.',
      },
      {
        input: 'numCourses = 2, prerequisites = [[0, 1], [1, 0]]',
        output: 'false',
        note: 'Each course waits on the other, so neither can start.',
      },
    ],
    constraints: [
      '1 <= numCourses <= 2,000',
      '0 <= prerequisites.length <= 5,000',
      'Every pair holds two course numbers inside the valid range.',
      'A pair may repeat, and a course may even list itself.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'Each pair `[course, needs]` says *finish `needs` first*. Draw it as an arrow from `needs` to `course`, so arrows point in the direction you move through the courses.',
        'Here there are 6 courses. The pair `[3, 0]` is the arrow from 0 to 3: course 0 must be done before course 3. Can you finish everything?',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Every pair is just an arrow, so this is a graph problem." },
      scene: {
        structures: [graph()],
        vars: [{ name: 'numCourses', value: 6 }],
        caption: 'Arrows point from prerequisite to course',
        leet: { at: 'graph/n5' },
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: keep guessing',
      body: [
        'One idea: pick a course, check that all its prerequisites are done, and if not, try another. Repeat until all are taken or you get stuck.',
        'Course 4 needs both 2 and 3, so picking it early fails. Every dead end sends you back to rescan the whole list of pairs, which wastes time as the lists grow.',
      ],
      scene: {
        structures: [graph({ 4: 'bad', 2: 'compare', 3: 'compare' }, { '2-4': 'compare', '3-4': 'compare' })],
        vars: [{ name: 'numCourses', value: 6 }],
        caption: 'Course 4 needs 2 and 3 first',
        leet: { at: 'graph/n5' },
      },
    },
    {
      kind: 'concept',
      title: 'Count what blocks each course',
      body: [
        'Count the arrows pointing into each course. That is its **in-degree**: how many prerequisites are still unfinished.',
        'A course with in-degree 0 has nothing blocking it, so you can take it now. Courses 0 and 1 qualify. Put them in a queue, and keep a counter `taken` for courses finished.',
      ],
      leet: { pose: 'hint', says: 'Zero blockers means go. Everything else waits for its count to hit zero.' },
      scene: {
        structures: [
          graph({ 0: 'active', 1: 'active' }),
          indeg(START_INDEG, { 0: 'active', 1: 'active' }),
          queue([0, 1]),
        ],
        vars: [{ name: 'taken', value: 0 }],
        caption: 'In-degree 0 goes in the queue',
        leet: { at: 'graph/n5' },
      },
    },
    {
      kind: 'concept',
      title: 'Take 0, unlock 2',
      body: [
        'Take the front course, 0. Mark it visited and bump `taken` to 1.',
        'Now follow its arrows. They lead to 2 and 3, and each lost a blocker, so their in-degrees drop: 2 goes from 1 to 0, and 3 goes from 2 to 1. Course 2 just hit zero, so it joins the queue.',
      ],
      scene: {
        structures: [
          graph({ 0: 'visited', 2: 'compare', 3: 'compare' }, { '0-2': 'compare', '0-3': 'compare' }),
          indeg([0, 0, 0, 1, 2, 1], { 2: 'active', 3: 'compare' }),
          queue([1, 2], { 2: 'active' }),
        ],
        vars: [{ name: 'taken', value: 1 }],
        caption: '2 hits zero, so it joins the queue',
      },
    },
    {
      kind: 'concept',
      title: 'Take 1, unlock 3',
      body: [
        'The front of the queue is 1. Take it, mark it visited, and `taken` becomes 2.',
        'Its only arrow leads to 3, whose in-degree drops from 1 to 0. Course 3 had two prerequisites, 0 and 1, and both are now done, so 3 joins the queue behind 2.',
      ],
      scene: {
        structures: [
          graph({ 0: 'visited', 1: 'visited', 3: 'compare' }, { '1-3': 'compare' }),
          indeg([0, 0, 0, 0, 2, 1], { 3: 'active' }),
          queue([2, 3], { 3: 'active' }),
        ],
        vars: [{ name: 'taken', value: 2 }],
        caption: '3 had two blockers, both are done',
      },
    },
    {
      kind: 'concept',
      title: 'Drain the queue',
      body: [
        'Take 2, and course 4 drops from 2 to 1. Take 3, and 4 drops to 0 while 5 drops to 0, so both join the queue. Taking 4 and 5 unlocks nothing new.',
        'The queue empties with `taken = 6`. That equals `numCourses`, so every course had a turn and the answer is `true`.',
      ],
      leet: { pose: 'cheer', says: 'Queue empty and all six taken. A valid order exists.' },
      scene: {
        structures: [
          graph({ 0: 'visited', 1: 'visited', 2: 'visited', 3: 'visited', 4: 'visited', 5: 'visited' }),
          indeg([0, 0, 0, 0, 0, 0]),
          queue([]),
        ],
        vars: [{ name: 'numCourses', value: 6 }, { name: 'taken', value: 6, tone: 'good' }],
        caption: 'taken equals numCourses, so true',
        leet: { pose: 'cheer', at: 'graph/n5' },
      },
    },
    {
      kind: 'concept',
      title: 'When a cycle blocks the way',
      body: [
        'Suppose 4 courses with arrows 0 to 1, 1 to 2, 2 to 3 and 3 to 1. Courses 1, 2 and 3 form a loop, each waiting on the one before it.',
        'Only 0 starts with in-degree 0. Take it, and 1 drops from 2 to 1, not 0. The queue is empty with `taken = 1`, and 1 is less than 4, so the answer is `false`.',
      ],
      scene: {
        structures: [
          cycleGraph(),
          indeg([0, 1, 1, 1], { 1: 'bad', 2: 'bad', 3: 'bad' }),
          queue([]),
        ],
        vars: [{ name: 'numCourses', value: 4 }, { name: 'taken', value: 1, tone: 'bad' }],
        caption: 'Queue empty, taken is 1 of 4',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `can_finish` (Python) or `canFinish` (JS / TS) using Kahn\'s algorithm. Build each course\'s in-degree and its list of unlocked courses, run the queue, and compare `taken` with `numCourses`.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You turned prerequisites into arrows and peeled courses off a queue, one unblocked course at a time.'],
      takeaways: [
        '**Pairs are arrows.** `[course, needs]` becomes an arrow from `needs` to `course`.',
        '**In-degree is the blocker count.** Zero means the course can be taken right now.',
        '**Queue, take, lower, enqueue.** Taking a course lowers its neighbours, and any that reach zero join the queue.',
        '**A cycle starves the queue.** If `taken` ends below `numCourses`, some courses wait on each other forever.',
      ],
      complexity: { time: 'O(V + E)', space: 'O(V + E)' },
      scene: {
        structures: [
          graph({ 0: 'visited', 1: 'visited', 2: 'visited', 3: 'visited', 4: 'visited', 5: 'visited' }),
          indeg([0, 0, 0, 0, 0, 0]),
          queue([]),
        ],
        vars: [{ name: 'numCourses', value: 6 }, { name: 'taken', value: 6, tone: 'good' }],
        caption: 'taken equals numCourses, so true',
        leet: { pose: 'cheer', at: 'graph/n5' },
      },
    },
  ],

  challenge: {
    entry: { python: 'can_finish', typescript: 'canFinish' },
    params: [
      { name: 'numCourses', type: 'json' },
      { name: 'prerequisites', type: 'json' },
    ],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def can_finish(num_courses: int, prerequisites: list[list[int]]) -> bool:
    # Return True if every course can be finished, given [course, needs] pairs.
    return False
`,
      typescript: `function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  // Return true if every course can be finished, given [course, needs] pairs.
  return false;
}
`,
    },
    solution: {
      python: `from collections import deque


def can_finish(num_courses: int, prerequisites: list[list[int]]) -> bool:
    unlocks = [[] for _ in range(num_courses)]  # needs -> courses that wait on it
    indegree = [0] * num_courses
    for course, needs in prerequisites:
        unlocks[needs].append(course)
        indegree[course] += 1

    queue = deque(c for c in range(num_courses) if indegree[c] == 0)
    taken = 0
    while queue:
        course = queue.popleft()
        taken += 1
        for nxt in unlocks[course]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    return taken == num_courses
`,
      typescript: `function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const unlocks: number[][] = Array.from({ length: numCourses }, () => []); // needs -> courses that wait on it
  const indegree: number[] = new Array(numCourses).fill(0);
  for (const [course, needs] of prerequisites) {
    unlocks[needs].push(course);
    indegree[course]++;
  }

  const queue: number[] = [];
  for (let c = 0; c < numCourses; c++) {
    if (indegree[c] === 0) queue.push(c);
  }
  let taken = 0;
  for (let head = 0; head < queue.length; head++) {
    const course = queue[head];
    taken++;
    for (const nxt of unlocks[course]) {
      indegree[nxt]--;
      if (indegree[nxt] === 0) queue.push(nxt);
    }
  }
  return taken === numCourses;
}
`,
    },
    tests: [
      {
        name: 'worked example',
        args: [6, [[2, 0], [3, 0], [3, 1], [4, 2], [4, 3], [5, 3]]],
        expected: true,
      },
      { name: 'two course cycle', args: [2, [[0, 1], [1, 0]]], expected: false },
      { name: 'no prerequisites', args: [3, []], expected: true },
      { name: 'simple chain', args: [4, [[1, 0], [2, 1], [3, 2]]], expected: true },
      {
        name: 'longer cycle inside a bigger graph',
        args: [6, [[1, 0], [2, 1], [3, 2], [1, 3], [4, 3], [5, 0]]],
        expected: false,
      },
      { name: 'course lists itself', args: [3, [[1, 1]]], expected: false },
      { name: 'disconnected parts', args: [5, [[1, 0], [3, 2]]], expected: true },
      { name: 'cycle in a separate part', args: [5, [[1, 0], [3, 2], [2, 3]]], expected: false },
    ],
    hints: [
      'A course with no unfinished prerequisites can be taken now. Count, for each course, how many prerequisites point into it.',
      'Keep a queue of courses whose count is 0. When you take one, lower the count of every course that was waiting on it.',
      'If a lowered count reaches 0, enqueue that course. At the end, compare how many courses you took with `numCourses`.',
    ],
  },
};

export default lesson;
