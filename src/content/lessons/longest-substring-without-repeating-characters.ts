import type { ArrayStructure, HashMapStructure, Lesson, Pointer, Tone } from '../schema';

const S = 'abcbda';

const chars = (
  tones: Partial<Record<number, Tone>> = {},
  pointers: Pointer[] = [],
  window?: [number, number],
): ArrayStructure => ({
  kind: 'array',
  id: 's',
  label: 's',
  cells: S.split('').map((value, i) => ({ id: `c${i}`, value, tone: tones[i] })),
  pointers,
  window,
});

const win = (keys: string[], tones: Partial<Record<string, Tone>> = {}): HashMapStructure => ({
  kind: 'hashmap',
  id: 'window',
  label: 'in window',
  entries: keys.map((key) => ({ key, tone: tones[key] })),
});

const lesson: Lesson = {
  slug: 'longest-substring-without-repeating-characters',
  title: 'Longest Substring Without Repeats',
  source: { leetcode: 3, name: 'Longest Substring Without Repeating Characters' },
  pattern: 'Sliding window with a set',
  difficulty: 'medium',
  minutes: 10,
  youllLearn: [
    'What a sliding window is and why it only moves forward',
    'Using a set to know if a character is already inside the window',
    'Shrinking from the left until the clash is gone',
    'Why the window is trimmed, never reset to empty',
  ],

  problem: {
    statement: [
      'You are given a string `s`. A **substring** is a run of characters that sit next to each other in `s`.',
      'Return the length of the longest substring in which no character appears twice.',
    ],
    examples: [
      { input: 's = "abcbda"', output: '4', note: 'The substring "cbda" has four different characters.' },
      { input: 's = "zzzz"', output: '1', note: 'Every substring longer than one repeats a z.' },
    ],
    constraints: [
      '0 <= s.length <= 50,000',
      '`s` holds lowercase letters, digits, symbols and spaces.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'Given a string, find the longest stretch of neighbouring characters where every character is different. You only return its **length**.',
        'In `s = "abcbda"` the stretch `"cbda"` works: four different letters in a row. Nothing longer avoids a repeat, so the answer is 4.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's find that stretch without testing every one." },
      scene: {
        structures: [chars({ 2: 'good', 3: 'good', 4: 'good', 5: 'good' })],
        vars: [{ name: 'best', value: 4 }],
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: every substring',
      body: [
        'The obvious plan: for each start position, extend the substring one character at a time and stop when a letter repeats. Keep the longest result.',
        'It works, but each start re-reads characters you already inspected. With `n` characters that is roughly `n²` work, and the repeated reading is wasted.',
      ],
      scene: {
        structures: [chars({ 0: 'compare', 1: 'compare', 2: 'compare' }, [{ id: 'start', at: 0 }, { id: 'end', at: 2 }])],
        vars: [{ name: 'best', value: 3 }],
        caption: 'Next start re-reads b and c.',
      },
    },
    {
      kind: 'concept',
      title: 'A window that slides',
      body: [
        'Keep a **window**, the stretch between `left` and `right`, that never holds a repeat. A set called `window` stores its characters so "is it already inside?" is one lookup.',
        'Push `right` forward one step at a time. If the new character is not in the set, the window grows. Otherwise, shrink from the left until it is safe.',
      ],
      leet: { pose: 'hint', says: 'Both ends only move forward, so every character is added and removed at most once.' },
      scene: {
        structures: [
          chars({ 0: 'active' }, [{ id: 'left', at: 0 }, { id: 'right', at: 0 }], [0, 0]),
          win(['a'], { a: 'active' }),
        ],
        vars: [{ name: 'best', value: 1 }],
      },
    },
    {
      kind: 'concept',
      title: 'Growing the window',
      body: [
        'Move `right` to b, then c. Neither is in the set, so each is added and the window grows to `[0, 2]`.',
        'The window holds `a`, `b`, `c`, so `len` is 3 and `best` becomes 3.',
      ],
      scene: {
        structures: [
          chars({ 0: 'visited', 1: 'visited', 2: 'active' }, [{ id: 'left', at: 0 }, { id: 'right', at: 2 }], [0, 2]),
          win(['a', 'b', 'c'], { c: 'active' }),
        ],
        vars: [{ name: 'best', value: 3 }, { name: 'len', value: 3 }],
      },
    },
    {
      kind: 'concept',
      title: 'A repeat appears',
      body: [
        '`right` moves to index 3, another b. The set already holds b, so adding it would break the rule. This is the clash.',
        'Do not throw the window away. The b is only a problem because of the **old** b at index 1, so we only need to remove things up to that one.',
      ],
      scene: {
        structures: [
          chars({ 0: 'visited', 1: 'compare', 2: 'visited', 3: 'bad' }, [{ id: 'left', at: 0 }, { id: 'right', at: 3 }], [0, 2]),
          win(['a', 'b', 'c'], { b: 'bad' }),
        ],
        vars: [{ name: 'best', value: 3 }, { name: 'len', value: 3 }],
        caption: 'b is already in the window.',
      },
    },
    {
      kind: 'concept',
      title: 'Shrink from the left',
      body: [
        'Drop characters from the left edge until b leaves the set. First `a` goes, then the old `b`. That moves `left` to index 2.',
        'The set now holds only `c`, so the window is `[2, 2]` and `len` is 1. It is trimmed, not emptied. `right` waits at the b, which is no longer a clash.',
      ],
      scene: {
        structures: [
          chars({ 0: 'muted', 1: 'muted', 2: 'visited', 3: 'active' }, [{ id: 'left', at: 2 }, { id: 'right', at: 3 }], [2, 2]),
          win(['c']),
        ],
        vars: [{ name: 'best', value: 3 }, { name: 'len', value: 1 }],
        caption: 'a and b dropped out of the window.',
      },
    },
    {
      kind: 'concept',
      title: 'Keep sliding to the end',
      body: [
        'Add the new `b`, then d, then a. None of them is in the set, so the window grows to `[2, 5]` and holds `c`, `b`, `d`, `a`.',
        '`len` is 4, which beats 3, so `best` becomes 4. The end of the string is reached, so the answer is 4.',
      ],
      scene: {
        structures: [
          chars({ 0: 'muted', 1: 'muted', 2: 'good', 3: 'good', 4: 'good', 5: 'good' }, [{ id: 'left', at: 2 }, { id: 'right', at: 5 }], [2, 5]),
          win(['c', 'b', 'd', 'a'], { c: 'good', b: 'good', d: 'good', a: 'good' }),
        ],
        vars: [{ name: 'best', value: 4, tone: 'good' }, { name: 'len', value: 4 }],
        caption: 'Window [2, 5] is longest: 4.',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `length_of_longest_substring` (Python) or `lengthOfLongestSubstring` (JS / TS) using a window and a set. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['A window that only moves forward, plus a set that answers "is it inside?", solves this in a single pass.'],
      takeaways: [
        '**Window plus set.** The set holds exactly the characters between `left` and `right`.',
        '**Grow right, shrink left.** On a clash, remove from the left until the repeat is gone.',
        '**Trim, never reset.** Clearing the window to empty throws away characters that still count.',
        '**Track the best.** After every step, compare the window length with `best`.',
      ],
      complexity: { time: 'O(n)', space: 'O(k)' },
    },
  ],

  challenge: {
    entry: { python: 'length_of_longest_substring', typescript: 'lengthOfLongestSubstring' },
    params: [{ name: 's', type: 'json' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def length_of_longest_substring(s: str) -> int:
    # Return the length of the longest substring with no repeated character.
    pass
`,
      typescript: `function lengthOfLongestSubstring(s: string): number {
  // Return the length of the longest substring with no repeated character.
  return 0;
}
`,
    },
    solution: {
      python: `def length_of_longest_substring(s: str) -> int:
    window = set()
    left = 0
    best = 0
    for right, ch in enumerate(s):
        while ch in window:
            window.remove(s[left])
            left += 1
        window.add(ch)
        best = max(best, right - left + 1)
    return best
`,
      typescript: `function lengthOfLongestSubstring(s: string): number {
  const window = new Set<string>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    while (window.has(s[right])) {
      window.delete(s[left]);
      left++;
    }
    window.add(s[right]);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
`,
    },
    tests: [
      { name: 'worked example', args: ['abcbda'], expected: 4 },
      { name: 'all the same character', args: ['zzzz'], expected: 1 },
      { name: 'empty string', args: [''], expected: 0 },
      { name: 'shrinks by more than one', args: ['abcdbea'], expected: 5 },
      { name: 'trim, do not reset', args: ['dvdf'], expected: 3 },
      { name: 'left edge never moves back', args: ['abba'], expected: 2 },
      { name: 'single character', args: ['q'], expected: 1 },
    ],
    hints: [
      'Keep two indexes, `left` and `right`, and a set of the characters between them.',
      'If `s[right]` is already in the set, remove `s[left]` and move `left` forward, repeating until it is not.',
      'After adding `s[right]`, compare the window length `right - left + 1` with your best so far.',
    ],
  },
};

export default lesson;
