import type { ArrayStructure, Lesson, Pointer, Tone } from '../schema';

const HEIGHTS = [4, 8, 3, 9, 2, 7, 5];

const walls = (tones: Partial<Record<number, Tone>> = {}, pointers: Pointer[] = []): ArrayStructure => ({
  kind: 'array',
  id: 'height',
  label: 'height',
  variant: 'bars',
  cells: HEIGHTS.map((value, i) => ({ value, tone: tones[i] })),
  pointers,
});

const lesson: Lesson = {
  slug: 'container-with-most-water',
  title: 'Container With Most Water',
  source: { leetcode: 11, name: 'Container With Most Water' },
  pattern: 'Greedy converging pointers',
  difficulty: 'medium',
  minutes: 10,
  youllLearn: [
    'How to score a container from two walls',
    'Why two pointers start at the far ends',
    'Why moving the shorter wall never loses the best answer',
    'Turning an O(n²) search into one pass',
  ],

  problem: {
    statement: [
      'You are given a list `height` of non-negative integers. Each value is the height of a vertical wall, and the walls stand one unit apart, left to right.',
      'Pick any two walls. Together with the floor they form a container, and its area is the **distance between the walls** times the **shorter wall**. Return the largest area you can get.',
    ],
    examples: [
      { input: 'height = [4, 8, 3, 9, 2, 7, 5]', output: '28', note: 'Walls at indices 1 and 5: 4 apart, shorter wall 7.' },
      { input: 'height = [1, 1]', output: '1', note: 'Two walls, one unit apart, both height 1.' },
    ],
    constraints: [
      '2 <= height.length <= 100,000',
      '0 <= height[i] <= 10,000',
      'The walls cannot be tilted, and a container cannot lean on a third wall.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'Each number is a wall. Choose two walls and the water level can only reach the **shorter** one, so the area is `(right - left) * min(height[left], height[right])`.',
        'Here the best pair is the walls at index 1 and index 5. They are 4 apart and the shorter one is 7, so the area is 28.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Wide and tall both matter, so let's find the best mix." },
      scene: {
        structures: [walls({ 1: 'good', 5: 'good' })],
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: every pair',
      body: [
        'The obvious plan: try every pair of walls, compute the area, and keep the largest.',
        'Take indices 0 and 3. They are 3 apart and the shorter wall is 4, so the area is 12. Trying all pairs costs about `n² / 2` checks, far too slow for 100,000 walls.',
      ],
      scene: {
        structures: [walls({ 0: 'compare', 3: 'compare' }, [{ id: 'i', at: 0 }, { id: 'j', at: 3 }])],
        vars: [{ name: 'area', value: 12 }],
        caption: '3 apart, shorter wall 4, so area 12.',
      },
    },
    {
      kind: 'concept',
      title: 'Start wide, then shrink',
      body: [
        'Start with `left` at the first wall and `right` at the last. This is the widest container there is.',
        'Every move shrinks the width by 1, so the only way to beat the current area is a **taller shorter wall**. Walls that are not the shorter one cannot help, because the shorter wall still sets the height.',
        'So move the pointer on the **shorter** wall. It is the only move that can raise the height.',
      ],
      leet: { pose: 'hint', says: 'The shorter wall caps every container it can still form, so it is the one to drop.' },
      scene: {
        structures: [walls({ 0: 'compare', 6: 'compare' }, [{ id: 'left', at: 0 }, { id: 'right', at: 6 }])],
        vars: [{ name: 'area', value: 24 }, { name: 'best', value: 24 }],
        caption: 'Width 6, shorter wall 4, area 24.',
      },
    },
    {
      kind: 'concept',
      title: 'Why the shorter wall can go',
      body: [
        'Keep wall 4 on the left and look at every container it could still make with a wall further in. Each one is narrower than now, and its height is at most 4, so it scores at most `4 * width`.',
        'The current container already has the largest width, so none of those can beat it. Wall 4 is finished, so we record 24 and move `left` to index 1.',
      ],
      scene: {
        structures: [
          walls({ 0: 'bad', 6: 'compare' }, [{ id: 'left', at: 0 }, { id: 'right', at: 6 }]),
        ],
        vars: [{ name: 'area', value: 24 }, { name: 'best', value: 24 }],
        caption: 'Wall 4 can never beat 24 again.',
      },
    },
    {
      kind: 'concept',
      title: 'Walk: left moves to 8',
      body: [
        '`left` is now 1 (height 8) and `right` is still 6 (height 5). The width is 5 and the shorter wall is 5, so `area = 25`, a new `best`.',
        'The right wall is shorter this time, so now `right` is the one that moves.',
      ],
      scene: {
        structures: [
          walls({ 0: 'muted', 1: 'compare', 6: 'compare' }, [{ id: 'left', at: 1 }, { id: 'right', at: 6 }]),
        ],
        vars: [{ name: 'area', value: 25 }, { name: 'best', value: 25 }],
        caption: 'Width 5, shorter wall 5, area 25.',
      },
    },
    {
      kind: 'concept',
      title: 'Walk: right moves to 7',
      body: [
        'Wall 5 is ruled out, so `right` moves to index 5 (height 7). The width drops to 4 but the shorter wall rises to 7.',
        'That gives `area = 4 * 7 = 28`, which beats 25. Now `best = 28`.',
      ],
      scene: {
        structures: [
          walls({ 0: 'muted', 1: 'compare', 5: 'compare', 6: 'muted' }, [{ id: 'left', at: 1 }, { id: 'right', at: 5 }]),
        ],
        vars: [{ name: 'area', value: 28 }, { name: 'best', value: 28 }],
        caption: 'Width 4, shorter wall 7, area 28.',
      },
    },
    {
      kind: 'concept',
      title: 'Keep going until they meet',
      body: [
        'The right wall 7 is shorter than 8, so `right` moves on: heights 2 and 9 give areas 6 and 16. Then `left` moves past 8 and 3 gives area 3. The pointers meet.',
        'None of those beat 28, so the answer is the pair at indices 1 and 5.',
      ],
      scene: {
        structures: [walls({ 0: 'muted', 1: 'good', 2: 'muted', 3: 'muted', 4: 'muted', 5: 'good', 6: 'muted' })],
        vars: [{ name: 'best', value: 28, tone: 'good' }],
        caption: 'Walls 1 and 5 hold the best container.',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `max_area` (Python) or `maxArea` (JS / TS) with two pointers that start at the ends. Move the pointer on the shorter wall each turn. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You replaced a check of every pair with one pass by always discarding the wall that cannot do better.'],
      takeaways: [
        '**Area is width times the shorter wall.** Taller walls do not matter beyond the lower one.',
        '**Start at the widest container.** Every move after that loses width.',
        '**Move the shorter wall.** It caps every container it can still form, so nothing is lost.',
        '**Greedy pointers.** When one choice is provably safe to discard, a single pass can replace a nested loop.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
  ],

  challenge: {
    entry: { python: 'max_area', typescript: 'maxArea' },
    params: [{ name: 'height', type: 'json' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def max_area(height: list[int]) -> int:
    # Return the largest area formed by any two walls.
    pass
`,
      typescript: `function maxArea(height: number[]): number {
  // Return the largest area formed by any two walls.
  return 0;
}
`,
    },
    solution: {
      python: `def max_area(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        area = (right - left) * min(height[left], height[right])
        best = max(best, area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best
`,
      typescript: `function maxArea(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let best = 0;
  while (left < right) {
    const area = (right - left) * Math.min(height[left], height[right]);
    best = Math.max(best, area);
    if (height[left] < height[right]) left++;
    else right--;
  }
  return best;
}
`,
    },
    tests: [
      { name: 'worked example', args: [[4, 8, 3, 9, 2, 7, 5]], expected: 28 },
      { name: 'two equal walls', args: [[1, 1]], expected: 1 },
      { name: 'two bars, different heights', args: [[5, 2]], expected: 2 },
      { name: 'all equal heights', args: [[6, 6, 6, 6]], expected: 18 },
      { name: 'tall walls in the middle', args: [[1, 9, 9, 1]], expected: 9 },
      { name: 'best pair is not the tallest', args: [[2, 3, 10, 5, 7, 8, 9]], expected: 36 },
      { name: 'zero height walls', args: [[0, 0, 4, 0]], expected: 0 },
    ],
    hints: [
      'Put one pointer at each end. The area is the width times the shorter wall.',
      'Moving the taller wall can only shrink the width without raising the height. Which wall should move instead?',
      'Move the pointer on the shorter wall, and keep the largest area you have seen.',
    ],
  },
};

export default lesson;
