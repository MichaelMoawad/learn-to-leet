import type { ArrayStructure, Lesson, StackStructure, Tone } from '../schema';

const TEMPS = [32, 35, 31, 30, 34, 36];

const bars = (tones: Partial<Record<number, Tone>> = {}, at?: number): ArrayStructure => ({
  kind: 'array',
  id: 'temps',
  label: 'temps',
  variant: 'bars',
  cells: TEMPS.map((value, i) => ({ id: `t${i}`, value, tone: tones[i] })),
  pointers: at === undefined ? [] : [{ id: 'i', at }],
});

// `filled` maps a day to its answer, every other day still shows 0.
const answer = (filled: Record<number, number> = {}): ArrayStructure => ({
  kind: 'array',
  id: 'ans',
  label: 'answer',
  cells: TEMPS.map((_, i) => ({
    id: `a${i}`,
    value: filled[i] ?? 0,
    tone: filled[i] === undefined ? undefined : 'good',
  })),
});

// Stack holds day indices, bottom first. Ids follow the index so pushes and pops tween.
const stack = (days: number[], tones: Partial<Record<number, Tone>> = {}): StackStructure => ({
  kind: 'stack',
  id: 'stack',
  label: 'stack',
  beside: true,
  items: days.map((d) => ({ id: `s${d}`, value: d, tone: tones[d] })),
});

const lesson: Lesson = {
  slug: 'daily-temperatures',
  title: 'Daily Temperatures',
  source: { leetcode: 739, name: 'Daily Temperatures' },
  pattern: 'Monotonic stack',
  difficulty: 'medium',
  minutes: 12,
  youllLearn: [
    'Why scanning ahead for every day wastes work',
    'How a stack of waiting days answers "next warmer day"',
    'Why the stack stays in decreasing order of temperature',
    'Why the whole scan is O(n) even with a loop inside a loop',
  ],

  problem: {
    statement: [
      'You get a list `temperatures` with one reading per day. For each day, work out how many days you must wait until a **strictly warmer** day arrives.',
      'Return a list of the same length. If no warmer day ever comes, that day gets `0`.',
    ],
    examples: [
      {
        input: 'temperatures = [32, 35, 31, 30, 34, 36]',
        output: '[1, 4, 2, 1, 1, 0]',
        note: 'Day 1 (35) waits 4 days for the 36 on day 5.',
      },
      {
        input: 'temperatures = [60, 50, 40, 30]',
        output: '[0, 0, 0, 0]',
        note: 'It only gets colder, so nobody ever finds a warmer day.',
      },
    ],
    constraints: [
      '1 <= temperatures.length <= 100,000',
      '0 <= temperatures[i] <= 100',
      'A day with the same temperature is not warmer.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'Each bar is one day, taller means warmer. For every day we want the number of days until a taller bar shows up to the right.',
        'Day 0 is 32 and day 1 is 35, so day 0 waits 1 day. Day 1 has to wait until day 5 (36), so it waits 4 days. The last day has nothing after it, so it gets 0.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's find every next warmer day in one pass." },
      scene: {
        structures: [bars({ 1: 'active', 5: 'good' }), answer({ 1: 4 }), stack([])],
        caption: 'Day 1 waits 4 days for day 5.',
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: scan ahead',
      body: [
        'The direct plan: for each day, walk right until you meet a warmer one. Pointer `j` scans ahead from day `i`.',
        'It works, but a long cold stretch makes every day rescan the same days again. On a list of `n` days that is about `n²` steps in the worst case.',
      ],
      scene: {
        structures: [
          {
            ...bars({ 1: 'compare', 2: 'compare' }, 1),
            pointers: [{ id: 'i', at: 1 }, { id: 'j', at: 2 }],
          },
          answer({ 0: 1 }),
          stack([]),
        ],
        vars: [{ name: 'i', value: 1 }, { name: 'j', value: 2, tone: 'bad' }],
        caption: '31 is not warmer than 35. Scan on.',
      },
    },
    {
      kind: 'concept',
      title: 'Let warm days answer back',
      body: [
        'Flip the direction. Instead of each day looking ahead, let each new day look **back** at days still waiting for something warmer.',
        'Keep those waiting days on a `stack`, storing their **indices**. Day 0 has no warmer day yet, so index 0 goes on the stack and waits.',
      ],
      leet: { pose: 'hint', says: 'The stack only ever holds days that have not found a warmer one.' },
      scene: {
        structures: [bars({ 0: 'active' }, 0), answer(), stack([0], { 0: 'active' })],
        vars: [{ name: 'i', value: 0 }],
        caption: 'Day 0 waits on the stack.',
      },
    },
    {
      kind: 'concept',
      title: 'A warmer day pops the stack',
      body: [
        'Day 1 is 35. The stack top is day 0 at 32, and 35 is warmer, so pop it. Set `ans[0] = 1 - 0 = 1`.',
        'Nobody else is waiting, so push day 1. A pop is always the same subtraction: the current index minus the popped index.',
      ],
      scene: {
        structures: [bars({ 0: 'visited', 1: 'active' }, 1), answer({ 0: 1 }), stack([1], { 1: 'active' })],
        vars: [{ name: 'i', value: 1 }, { name: 'j', value: 0, tone: 'good' }],
        caption: 'Day 1 pops day 0, so ans[0] = 1.',
      },
    },
    {
      kind: 'concept',
      title: 'Colder days just pile up',
      body: [
        'Day 2 is 31 and day 3 is 30. Neither is warmer than the top of the stack, so nothing pops and both are pushed.',
        'The stack now holds days 1, 2, 3 with temperatures 35, 31, 30. It only ever **decreases** from bottom to top, because a warmer day would have popped the colder ones.',
      ],
      scene: {
        structures: [
          bars({ 0: 'visited', 2: 'compare', 3: 'active' }, 3),
          answer({ 0: 1 }),
          stack([1, 2, 3], { 3: 'active', 2: 'compare' }),
        ],
        vars: [{ name: 'i', value: 3 }],
        caption: 'Nothing is warmer, so push day 3.',
      },
    },
    {
      kind: 'concept',
      title: 'One day pops several',
      body: [
        'Day 4 is 34. It beats the top (day 3, 30) and then day 2 (31), so both pop: `ans[3] = 1` and `ans[2] = 2`.',
        'Day 1 is 35, not warmer, so the popping stops and day 4 is pushed. Each pop is a day that just got its answer.',
      ],
      scene: {
        structures: [
          bars({ 0: 'visited', 1: 'compare', 2: 'visited', 3: 'visited', 4: 'active' }, 4),
          answer({ 0: 1, 2: 2, 3: 1 }),
          stack([1, 4], { 1: 'compare', 4: 'active' }),
        ],
        vars: [{ name: 'i', value: 4 }, { name: 'j', value: 2, tone: 'good' }],
        caption: 'Day 4 pops days 3 and 2, stops at 35.',
      },
    },
    {
      kind: 'concept',
      title: 'The hottest day clears all',
      body: [
        'Day 5 is 36, warmer than everything still waiting. Day 4 (34) pops first, then day 1 (35).',
        'That gives `ans[4] = 1` and `ans[1] = 4`. Day 5 is pushed and the loop ends. It never found a warmer day, so its answer stays 0.',
      ],
      scene: {
        structures: [
          bars({ 0: 'visited', 1: 'visited', 2: 'visited', 3: 'visited', 4: 'visited', 5: 'active' }, 5),
          answer({ 0: 1, 1: 4, 2: 2, 3: 1, 4: 1 }),
          stack([5], { 5: 'active' }),
        ],
        vars: [{ name: 'i', value: 5 }, { name: 'j', value: 1, tone: 'good' }],
        caption: 'ans is [1, 4, 2, 1, 1, 0]',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `daily_temperatures` (Python) or `dailyTemperatures` (JS / TS) with a stack of waiting indices. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You replaced a rescan for every day with one pass and a stack of days that are still waiting.'],
      takeaways: [
        '**Look back, not ahead.** Each new day answers every waiting day it is warmer than.',
        '**Store indices.** The wait is just `i - j`, and you can read the temperature from the index.',
        '**The stack stays decreasing.** Warmer days pop colder ones, so the top is always the next one to resolve.',
        '**Each day moves once.** One push and at most one pop per day, so the inner while loop is O(n) in total.',
      ],
      complexity: { time: 'O(n)', space: 'O(n)' },
    },
  ],

  challenge: {
    entry: { python: 'daily_temperatures', typescript: 'dailyTemperatures' },
    params: [{ name: 'temperatures', type: 'json' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def daily_temperatures(temperatures: list[int]) -> list[int]:
    # For each day, return how many days until a strictly warmer day (0 if none).
    pass
`,
      typescript: `function dailyTemperatures(temperatures: number[]): number[] {
  // For each day, return how many days until a strictly warmer day (0 if none).
  return [];
}
`,
    },
    solution: {
      python: `def daily_temperatures(temperatures: list[int]) -> list[int]:
    ans = [0] * len(temperatures)
    stack = []  # indices of days still waiting for a warmer day
    for i, temp in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < temp:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans
`,
      typescript: `function dailyTemperatures(temperatures: number[]): number[] {
  const ans: number[] = new Array(temperatures.length).fill(0);
  const stack: number[] = []; // indices of days still waiting for a warmer day
  for (let i = 0; i < temperatures.length; i++) {
    while (stack.length > 0 && temperatures[stack[stack.length - 1]] < temperatures[i]) {
      const j = stack.pop() as number;
      ans[j] = i - j;
    }
    stack.push(i);
  }
  return ans;
}
`,
    },
    tests: [
      { name: 'worked example', args: [[32, 35, 31, 30, 34, 36]], expected: [1, 4, 2, 1, 1, 0] },
      { name: 'strictly decreasing', args: [[60, 50, 40, 30]], expected: [0, 0, 0, 0] },
      { name: 'single day', args: [[50]], expected: [0] },
      { name: 'strictly increasing', args: [[10, 20, 30, 40]], expected: [1, 1, 1, 0] },
      { name: 'equal is not warmer', args: [[40, 40, 41, 40]], expected: [2, 1, 0, 0] },
      { name: 'warm day far ahead', args: [[30, 25, 20, 35]], expected: [3, 2, 1, 0] },
    ],
    hints: [
      'Keep a stack of day indices that have not yet found a warmer day.',
      'For each new day, pop while the temperature at the stack top is lower than today.',
      'When you pop index `j` on day `i`, the answer for `j` is `i - j`. Then push `i`.',
    ],
  },
};

export default lesson;
