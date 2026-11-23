import type { ArrayStructure, HashMapStructure, Lesson, Pointer, Tone } from '../schema';

const NUMS = [6, 2, 15, 9, 3];
const TARGET = 11;

const nums = (tones: Partial<Record<number, Tone>> = {}, pointers: Pointer[] = []): ArrayStructure => ({
  kind: 'array',
  id: 'nums',
  label: 'nums',
  cells: NUMS.map((value, i) => ({ value, tone: tones[i] })),
  pointers,
});

const seen = (keys: number[], tones: Partial<Record<number, Tone>> = {}): HashMapStructure => ({
  kind: 'hashmap',
  id: 'seen',
  label: 'seen (value → index)',
  entries: keys.map((key) => ({ key, value: NUMS.indexOf(key), tone: tones[key] })),
});

const lesson: Lesson = {
  slug: 'two-sum',
  title: 'Two Sum',
  source: { leetcode: 1, name: 'Two Sum' },
  pattern: 'Hash map lookup',
  difficulty: 'easy',
  minutes: 8,
  youllLearn: [
    'Why checking every pair costs O(n²)',
    'How to turn "find a pair" into "have I seen the partner?"',
    'Using a hash map for constant-time lookups',
    'Why you check the map before you insert',
  ],

  problem: {
    statement: [
      'You are given a list of integers `nums` and an integer `target`. Exactly one pair of **different positions** in the list holds values that add up to `target`.',
      'Return the two positions as a list `[i, j]` with `i < j`.',
    ],
    examples: [
      { input: 'nums = [6, 2, 15, 9, 3], target = 11', output: '[1, 3]', note: '2 + 9 = 11' },
      { input: 'nums = [5, 5], target = 10', output: '[0, 1]', note: 'Equal values are fine as long as the positions differ.' },
    ],
    constraints: [
      '2 <= nums.length <= 10,000',
      '-1,000,000,000 <= nums[i], target <= 1,000,000,000',
      'Exactly one valid pair exists.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'You get a list of numbers and a target. Exactly one pair of numbers in the list adds up to the target. Your job is to return the **positions** of that pair, smaller index first.',
        'Here `nums = [6, 2, 15, 9, 3]` and `target = 11`. The answer is `[1, 3]`, because `2 + 9 = 11`.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's find that pair without checking every combination." },
      scene: {
        structures: [nums({ 1: 'good', 3: 'good' })],
        vars: [{ name: 'target', value: TARGET }],
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: every pair',
      body: [
        'The obvious plan: pick a number, then check it against every number after it. Pointer `i` holds the first number while `j` scans the rest.',
        'It works, but each number gets compared with nearly every other one. For a list of `n` numbers that is about `n² / 2` checks, which gets slow fast.',
      ],
      scene: {
        structures: [nums({ 0: 'compare', 1: 'compare' }, [{ id: 'i', at: 0 }, { id: 'j', at: 1 }])],
        vars: [{ name: 'target', value: TARGET }, { name: 'sum', value: 8, tone: 'bad' }],
        caption: '6 + 2 = 8, not 11. Move j and try again.',
      },
    },
    {
      kind: 'concept',
      title: 'Flip the question',
      body: [
        'Stop asking *which two numbers add up to 11?* Ask this instead: *I am holding 6, so what number would finish the pair?*',
        'There is only one answer: `11 - 6 = 5`. Call it `need`. For every number the partner is fixed, so the problem becomes: have I already seen `need`?',
      ],
      scene: {
        structures: [nums({ 0: 'active' }, [{ id: 'i', at: 0 }])],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: 5, tone: 'active' }],
      },
    },
    {
      kind: 'concept',
      title: "Remember what you've seen",
      body: [
        'To answer *have I seen it?* instantly, keep a hash map called `seen` that stores each value with its index.',
        'At `i = 0` we need 5. The map is empty, so no luck. Before moving on, store `6 → 0` so later numbers can find it.',
      ],
      leet: { pose: 'hint', says: 'A hash map lookup takes the same time no matter how big the map gets.' },
      scene: {
        structures: [nums({ 0: 'active' }, [{ id: 'i', at: 0 }]), seen([6], { 6: 'active' })],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: 5, tone: 'bad' }],
        caption: '5 is not in seen yet. Store 6 → 0.',
      },
    },
    {
      kind: 'concept',
      title: 'Index 1: still no match',
      body: [
        'Now `i = 1` and the number is 2, so `need = 11 - 2 = 9`.',
        'Is 9 in `seen`? No, the map only holds 6. Store `2 → 1` and move on. Notice there is no inner loop: each number costs one lookup and one insert.',
      ],
      scene: {
        structures: [nums({ 0: 'visited', 1: 'active' }, [{ id: 'i', at: 1 }]), seen([6, 2], { 2: 'active' })],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: 9, tone: 'bad' }],
      },
    },
    {
      kind: 'concept',
      title: 'Index 2: nothing yet',
      body: [
        'At `i = 2` the number is 15, so `need = 11 - 15 = -4`. Negative numbers are fine, the arithmetic is the same.',
        '-4 is not in the map. Store `15 → 2` and keep walking. The map now remembers everything to the left of `i`.',
      ],
      scene: {
        structures: [
          nums({ 0: 'visited', 1: 'visited', 2: 'active' }, [{ id: 'i', at: 2 }]),
          seen([6, 2, 15], { 15: 'active' }),
        ],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: -4, tone: 'bad' }],
      },
    },
    {
      kind: 'concept',
      title: 'Index 3: match',
      body: [
        'At `i = 3` the number is 9, so `need = 11 - 9 = 2`.',
        'This time the lookup hits: `seen` has `2 → 1`. The partner sits at index 1 and we are at index 3, so we return `[1, 3]`. Found in a single pass.',
      ],
      leet: { pose: 'cheer', says: 'One pass, one map. That is the whole trick.' },
      scene: {
        structures: [
          nums({ 0: 'visited', 1: 'good', 2: 'visited', 3: 'good' }, [{ id: 'i', at: 3 }]),
          seen([6, 2, 15], { 2: 'good' }),
        ],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: 2, tone: 'good' }],
        caption: 'seen[2] = 1, so the answer is [1, 3].',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `two_sum` (Python) or `twoSum` (JS / TS) using the one-pass hash map idea. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You swapped a slow nested loop for a single pass by remembering what you had already seen.'],
      takeaways: [
        '**Flip the question.** For each number the partner is fixed: `target - num`.',
        '**Trade memory for speed.** A hash map answers *have I seen this?* in constant time.',
        '**Check first, store second.** That order stops a number pairing with itself.',
        '**Spot the pattern.** "Find a pair that satisfies X" often means a hash map of what you have seen so far.',
      ],
      complexity: { time: 'O(n)', space: 'O(n)' },
    },
  ],

  challenge: {
    entry: { python: 'two_sum', typescript: 'twoSum' },
    params: [
      { name: 'nums', type: 'json' },
      { name: 'target', type: 'json' },
    ],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Return [i, j] with i < j where nums[i] + nums[j] == target.
    pass
`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  // Return [i, j] with i < j where nums[i] + nums[j] === target.
  return [];
}
`,
    },
    solution: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        need = target - num
        if need in seen:
            return [seen[need], i]
        seen[num] = i
    return []
`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    const j = seen.get(need);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
}
`,
    },
    tests: [
      { name: 'worked example', args: [[6, 2, 15, 9, 3], 11], expected: [1, 3] },
      { name: 'two equal values', args: [[5, 5], 10], expected: [0, 1] },
      { name: 'pair at both ends', args: [[1, 5, 8, 3], 4], expected: [0, 3] },
      { name: 'negative numbers', args: [[-4, 10, 7, -6], 1], expected: [2, 3] },
      { name: 'cannot reuse one position', args: [[3, 4, 2], 6], expected: [1, 2] },
      { name: 'zeros', args: [[0, 7, 0], 0], expected: [0, 2] },
    ],
    hints: [
      'For each number, work out the value that would complete the pair: `target - num`.',
      'Keep a map from value to index for the numbers you have already passed.',
      'Look up `need` in the map before you store the current number.',
    ],
  },
};

export default lesson;
