import type { ArrayStructure, Lesson, Pointer, Tone } from '../schema';

const NUMS = [-8, -3, 0, 4, 7, 11, 15, 20, 26];
const TARGET = 11;

const nums = (tones: Partial<Record<number, Tone>> = {}, pointers: Pointer[] = []): ArrayStructure => ({
  kind: 'array',
  id: 'nums',
  label: 'nums',
  cells: NUMS.map((value, i) => ({ value, tone: tones[i] })),
  pointers,
});

// Tones for a range of indices, e.g. muted for everything that was ruled out.
const range = (from: number, to: number, tone: Tone): Partial<Record<number, Tone>> => {
  const out: Partial<Record<number, Tone>> = {};
  for (let i = from; i <= to; i++) out[i] = tone;
  return out;
};

const lesson: Lesson = {
  slug: 'binary-search',
  title: 'Binary Search',
  source: { leetcode: 704, name: 'Binary Search' },
  pattern: 'Halving the search space',
  difficulty: 'easy',
  minutes: 8,
  youllLearn: [
    'Why a sorted list lets you throw half of it away with one check',
    'How `lo`, `mid` and `hi` shrink the search range',
    'Why the loop runs while `lo <= hi`',
    'Why `mid` is skipped when you move a pointer',
  ],

  problem: {
    statement: [
      'You are given a list of **distinct** integers `nums` sorted from smallest to largest, and an integer `target`.',
      'Return the index where `target` sits in the list, or `-1` if it is not there. Aim for far fewer checks than looking at every number.',
    ],
    examples: [
      { input: 'nums = [-8, -3, 0, 4, 7, 11, 15, 20, 26], target = 11', output: '5', note: '11 sits at index 5.' },
      { input: 'nums = [-5, 1, 6, 10], target = 4', output: '-1', note: '4 would fall between 1 and 6, but it is not in the list.' },
    ],
    constraints: [
      '1 <= nums.length <= 10,000',
      '-10,000 <= nums[i], target <= 10,000',
      'All values in nums are distinct and sorted in increasing order.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'You get a sorted list of distinct numbers and a `target`. Return the **index** of the target, or `-1` if it is missing.',
        'Here `nums = [-8, -3, 0, 4, 7, 11, 15, 20, 26]` and `target = 11`. The answer is `5`, because `nums[5]` is 11.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. The list is sorted, and that is a gift we are going to use." },
      scene: {
        structures: [nums({ 5: 'good' })],
        vars: [{ name: 'target', value: TARGET }],
      },
    },
    {
      kind: 'concept',
      title: 'Naive: check every cell',
      body: [
        'The obvious plan: start at index 0 and walk right, comparing each number with the target until you find it or run out.',
        'That works, but it ignores the fact that the list is sorted. For a list of `n` numbers you may need `n` checks, so a million numbers could mean a million looks.',
      ],
      scene: {
        structures: [nums({ 0: 'visited', 1: 'visited', 2: 'visited', 3: 'compare' }, [{ id: 'i', at: 3 }])],
        vars: [{ name: 'target', value: TARGET }],
        caption: '4 is not 11. Keep walking.',
      },
    },
    {
      kind: 'concept',
      title: 'Sorted means you can skip',
      body: [
        'Look at the middle number. If it is smaller than the target, then everything to its left is smaller still, so none of it can be the target. If it is bigger, everything to its right is out.',
        'One check removes **half** the list. Track the live range with two pointers: `lo` at the first index and `hi` at the last.',
      ],
      leet: { pose: 'hint', says: 'Sorted order lets one comparison rule out a whole half.' },
      scene: {
        structures: [nums({}, [{ id: 'lo', at: 0 }, { id: 'hi', at: 8 }])],
        vars: [
          { name: 'target', value: TARGET },
          { name: 'lo', value: 0 },
          { name: 'hi', value: 8 },
        ],
      },
    },
    {
      kind: 'concept',
      title: 'Check the middle',
      body: [
        'Pick the middle of the range: `mid = lo + (hi - lo) // 2`, which is index 4. (Writing it this way instead of `(lo + hi) // 2` avoids overflow in languages with fixed-size ints.)',
        '`nums[4]` is 7, and `7 < 11`. So the target must lie to the right, and indices 0 to 4 are ruled out. Next step `lo` moves to `mid + 1`.',
      ],
      scene: {
        structures: [nums({ 4: 'compare' }, [{ id: 'lo', at: 0 }, { id: 'mid', at: 4 }, { id: 'hi', at: 8 }])],
        vars: [
          { name: 'target', value: TARGET },
          { name: 'lo', value: 0 },
          { name: 'mid', value: 4, tone: 'compare' },
          { name: 'hi', value: 8 },
        ],
        caption: '7 < 11: drop indices 0 to 4.',
      },
    },
    {
      kind: 'concept',
      title: 'Half the range is gone',
      body: [
        'With `lo = 5` and `hi = 8`, the new middle is `mid = 5 + (8 - 5) // 2 = 6`. Now `nums[6]` is 15, and `15 > 11`.',
        'Too big, so the target must be to the left of index 6. Everything from index 6 on is ruled out, and `hi` will move to `mid - 1`.',
      ],
      scene: {
        structures: [
          nums({ ...range(0, 4, 'muted'), 6: 'compare' }, [{ id: 'lo', at: 5 }, { id: 'mid', at: 6 }, { id: 'hi', at: 8 }]),
        ],
        vars: [
          { name: 'target', value: TARGET },
          { name: 'lo', value: 5 },
          { name: 'mid', value: 6, tone: 'compare' },
          { name: 'hi', value: 8 },
        ],
        caption: '15 > 11: drop indices 6 to 8.',
      },
    },
    {
      kind: 'concept',
      title: 'One cell left, keep looping',
      body: [
        'Now `hi = 5` and `lo = 5`: a single cell remains, and `mid = 5`. The loop must still run here, so the condition is `lo <= hi`, not `lo < hi`.',
        'Pointers always jump to `mid + 1` or `mid - 1`, never to `mid`. The checked cell leaves the range, so the range shrinks every round and the loop cannot hang.',
      ],
      scene: {
        structures: [
          nums({ ...range(0, 4, 'muted'), ...range(6, 8, 'muted'), 5: 'compare' }, [
            { id: 'lo', at: 5 },
            { id: 'mid', at: 5 },
            { id: 'hi', at: 5 },
          ]),
        ],
        vars: [
          { name: 'target', value: TARGET },
          { name: 'lo', value: 5 },
          { name: 'mid', value: 5, tone: 'compare' },
          { name: 'hi', value: 5 },
        ],
        caption: 'lo <= hi, so check this cell.',
      },
    },
    {
      kind: 'concept',
      title: 'Found it',
      body: [
        '`nums[5]` is 11, which equals the target, so return `mid`, which is `5`.',
        'Three checks on a list of nine. If the target were missing, `lo` would end up bigger than `hi`, the range would be empty, the loop would stop, and you would return `-1`.',
      ],
      scene: {
        structures: [
          nums({ ...range(0, 4, 'muted'), ...range(6, 8, 'muted'), 5: 'good' }, [
            { id: 'lo', at: 5 },
            { id: 'mid', at: 5 },
            { id: 'hi', at: 5 },
          ]),
        ],
        vars: [
          { name: 'target', value: TARGET },
          { name: 'lo', value: 5 },
          { name: 'mid', value: 5, tone: 'good' },
          { name: 'hi', value: 5 },
        ],
        caption: 'nums[5] = 11, so return 5.',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `binary_search` (Python) or `binarySearch` (JS / TS) with `lo`, `mid` and `hi`. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You replaced a one-by-one scan with a search that throws away half the list on every check.'],
      takeaways: [
        '**Sorted data is a signal.** One comparison against the middle rules out a whole half.',
        '**Keep a live range.** `lo` and `hi` bound where the target can still be.',
        '**Loop while `lo <= hi`.** A range of one cell still needs checking.',
        '**Move past `mid`.** Use `mid + 1` or `mid - 1` so the range always shrinks.',
        '**Spot the pattern.** "Sorted" plus "find" usually means halve the search space.',
      ],
      complexity: { time: 'O(log n)', space: 'O(1)' },
    },
  ],

  challenge: {
    entry: { python: 'binary_search', typescript: 'binarySearch' },
    params: [
      { name: 'nums', type: 'json' },
      { name: 'target', type: 'json' },
    ],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def binary_search(nums: list[int], target: int) -> int:
    # Return the index of target in the sorted list nums, or -1 if it is missing.
    pass
`,
      typescript: `function binarySearch(nums: number[], target: number): number {
  // Return the index of target in the sorted array nums, or -1 if it is missing.
  return 0;
}
`,
    },
    solution: {
      python: `def binary_search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
      typescript: `function binarySearch(nums: number[], target: number): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
`,
    },
    tests: [
      { name: 'worked example', args: [[-8, -3, 0, 4, 7, 11, 15, 20, 26], 11], expected: 5 },
      { name: 'missing, between two values', args: [[-5, 1, 6, 10], 4], expected: -1 },
      { name: 'target at index 0', args: [[-8, -3, 0, 4, 7, 11, 15, 20, 26], -8], expected: 0 },
      { name: 'target at last index', args: [[-8, -3, 0, 4, 7, 11, 15, 20, 26], 26], expected: 8 },
      { name: 'missing, smaller than all', args: [[-8, -3, 0, 4, 7, 11, 15, 20, 26], -20], expected: -1 },
      { name: 'missing, larger than all', args: [[-8, -3, 0, 4, 7, 11, 15, 20, 26], 40], expected: -1 },
      { name: 'single element found', args: [[7], 7], expected: 0 },
      { name: 'single element not found', args: [[7], 3], expected: -1 },
    ],
    hints: [
      'Keep two indices, `lo` and `hi`, that bound where the target could still be. Start with the whole list.',
      'Look at `mid = lo + (hi - lo) // 2`. If `nums[mid]` is too small, the target is to the right. If too big, to the left.',
      'Move `lo` to `mid + 1` or `hi` to `mid - 1`, and loop while `lo <= hi` so a one-cell range still gets checked.',
    ],
  },
};

export default lesson;
