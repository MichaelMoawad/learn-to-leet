import type { ArrayStructure, Lesson, Pointer, Tone } from '../schema';

const N = 6;
// ways to reach each step 0..6 (step 0 is the ground)
const WAYS = [1, 1, 2, 3, 5, 8, 13];

const dp = (
  filled: number,
  tones: Partial<Record<number, Tone>> = {},
  pointers: Pointer[] = [],
  subs: Partial<Record<number, string>> = {},
): ArrayStructure => ({
  kind: 'array',
  id: 'dp',
  label: 'dp',
  cells: WAYS.map((w, i) => ({
    id: `s${i}`,
    value: i < filled ? w : '?',
    tone: tones[i],
    sub: subs[i],
  })),
  pointers,
});

const lesson: Lesson = {
  slug: 'climbing-stairs',
  title: 'Climbing Stairs',
  source: { leetcode: 70, name: 'Climbing Stairs' },
  pattern: '1D DP table',
  difficulty: 'easy',
  minutes: 8,
  youllLearn: [
    'Why plain recursion repeats the same work',
    'How to write a step as the sum of two smaller steps',
    'Filling a 1D table from the ground up',
    'Shrinking the table to two variables',
  ],

  problem: {
    statement: [
      'A staircase has `n` steps. You start on the ground and want to reach the top step. Each move takes you up either **1 step or 2 steps**.',
      'Return how many **different sequences of moves** get you to the top.',
    ],
    examples: [
      { input: 'n = 6', output: '13', note: 'Thirteen different mixes of single and double steps.' },
      { input: 'n = 1', output: '1', note: 'Only one move works: a single step.' },
    ],
    constraints: ['1 <= n <= 45', 'The answer always fits in a 32-bit integer.'],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'Leet wants to climb a staircase with `n = 6` steps. Each hop covers one step or two. Two paths count as different if the hops differ in any way, so `1, 2` is not the same as `2, 1`.',
        'How many different paths lead to the top? The answer here is 13.',
      ],
      leet: { pose: 'idle', says: "Let's count the paths without listing every single one." },
      scene: {
        structures: [dp(0, { 6: 'active' })],
        vars: [{ name: 'n', value: N }],
        caption: 'Count the ways to reach the top.',
      },
    },
    {
      kind: 'concept',
      title: 'Naive recursion repeats itself',
      body: [
        'A natural idea: to count paths to step 6, count paths to step 5 and step 4, then add them. Each of those splits the same way again.',
        'The trouble is the overlap. Step 4 is needed by both step 6 and step 5, and the copies multiply down the stairs. Step 2 gets recomputed five times, and the total work doubles roughly every step.',
      ],
      scene: {
        structures: [
          dp(0, { 0: 'compare', 1: 'compare', 2: 'compare', 3: 'compare', 4: 'compare', 5: 'idle', 6: 'idle' }, [], {
            0: 'x5',
            1: 'x8',
            2: 'x5',
            3: 'x3',
            4: 'x2',
            5: 'x1',
            6: 'x1',
          }),
        ],
        vars: [{ name: 'n', value: N }, { name: 'calls', value: 25, tone: 'bad' }],
        caption: 'Recursion visits each step this often.',
      },
    },
    {
      kind: 'concept',
      title: 'The last hop decides',
      body: [
        'Think about the final hop onto step 6. It was either a single step from step 5, or a double step from step 4. Nothing else is possible.',
        'So `ways(6) = ways(5) + ways(4)`. In general `ways(i) = ways(i-1) + ways(i-2)`. If we store each answer in a table the first time we compute it, nothing is ever repeated.',
      ],
      leet: { pose: 'hint', says: 'Every step only needs the two steps just below it.' },
      scene: {
        structures: [dp(0, { 4: 'compare', 5: 'compare', 6: 'active' })],
        vars: [{ name: 'n', value: N }],
        caption: 'ways(6) = ways(5) + ways(4)',
      },
    },
    {
      kind: 'concept',
      title: 'Base cases, then step 2',
      body: [
        'Start with what we know. The ground (`dp[0]`) has 1 way: do nothing. Step 1 (`dp[1]`) has 1 way: one single hop.',
        'Now `i = 2`. Add the two cells below it: `dp[1] + dp[0] = 1 + 1 = 2`. The two paths are `1, 1` and `2`.',
      ],
      scene: {
        structures: [dp(3, { 0: 'compare', 1: 'compare', 2: 'active' }, [{ id: 'i', at: 2 }])],
        vars: [{ name: 'n', value: N }, { name: 'i', value: 2 }, { name: 'dp[i]', value: 2, tone: 'active' }],
        caption: 'dp[2] = dp[1] + dp[0] = 1 + 1',
      },
    },
    {
      kind: 'concept',
      title: 'Keep filling to the right',
      body: [
        'Each new cell only looks back two places. Step 3 came out as 3, and now we are at `i = 4`.',
        'It reads `dp[3] + dp[2] = 3 + 2 = 5`. Each cell takes one addition, so the whole table costs only about `n` additions.',
      ],
      scene: {
        structures: [
          dp(5, { 0: 'visited', 1: 'visited', 2: 'compare', 3: 'compare', 4: 'active' }, [{ id: 'i', at: 4 }]),
        ],
        vars: [{ name: 'n', value: N }, { name: 'i', value: 4 }, { name: 'dp[i]', value: 5, tone: 'active' }],
        caption: 'dp[4] = dp[3] + dp[2] = 3 + 2',
      },
    },
    {
      kind: 'concept',
      title: 'The top step is the answer',
      body: [
        'Step 5 filled in as 8. For the top step, `i = 6`, we add `dp[5] + dp[4] = 8 + 5 = 13`.',
        'That last cell is the answer: 13 different paths up six steps, found with six small additions instead of a pile of repeated recursion.',
      ],
      scene: {
        structures: [
          dp(7, { 0: 'visited', 1: 'visited', 2: 'visited', 3: 'visited', 4: 'compare', 5: 'compare', 6: 'good' }, [
            { id: 'i', at: 6 },
          ]),
        ],
        vars: [{ name: 'n', value: N }, { name: 'i', value: 6 }, { name: 'dp[n]', value: 13, tone: 'good' }],
        caption: 'dp[6] = dp[5] + dp[4] = 8 + 5 = 13',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `climb_stairs` (Python) or `climbStairs` (JS / TS) that returns the number of ways to reach step `n`. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You replaced exponential recursion with one pass over a small table.'],
      takeaways: [
        '**Split on the last move.** The final hop came from one step below or two steps below.',
        '**Overlap means a table.** When recursion recomputes the same inputs, store each answer once.',
        '**Fill from the bottom.** Base cases first, then each cell from the two before it.',
        '**Shrink it.** Only two earlier values matter, so two variables replace the whole table and space drops to O(1).',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
  ],

  challenge: {
    entry: { python: 'climb_stairs', typescript: 'climbStairs' },
    params: [{ name: 'n', type: 'json' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def climb_stairs(n: int) -> int:
    # Return the number of ways to reach step n using hops of 1 or 2.
    pass
`,
      typescript: `function climbStairs(n: number): number {
  // Return the number of ways to reach step n using hops of 1 or 2.
  return 0;
}
`,
    },
    solution: {
      python: `def climb_stairs(n: int) -> int:
    dp = [1] * (n + 1)  # dp[i] = ways to reach step i
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]
`,
      typescript: `function climbStairs(n: number): number {
  const dp: number[] = new Array(n + 1).fill(1); // dp[i] = ways to reach step i
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}
`,
    },
    tests: [
      { name: 'worked example', args: [6], expected: 13 },
      { name: 'single step', args: [1], expected: 1 },
      { name: 'two steps', args: [2], expected: 2 },
      { name: 'three steps', args: [3], expected: 3 },
      { name: 'ten steps', args: [10], expected: 89 },
      { name: 'large n beats naive recursion', args: [45], expected: 1836311903 },
    ],
    hints: [
      'The last hop came from step `i - 1` or step `i - 2`, so `ways(i)` is the sum of those two.',
      'Make a table `dp` where `dp[0] = 1` and `dp[1] = 1`, then fill from `i = 2` up to `n`.',
      'Plain recursion is too slow for large `n`. Fill the table once, left to right, and return `dp[n]`.',
    ],
  },
};

export default lesson;
