import type { ArrayStructure, Lesson, Pointer, Tone } from '../schema';

const TEXT = 'Race car!';
const CHARS = TEXT.split('').map((c) => (c === ' ' ? '·' : c));

const str = (tones: Partial<Record<number, Tone>> = {}, pointers: Pointer[] = []): ArrayStructure => ({
  kind: 'array',
  id: 's',
  label: 's',
  cells: CHARS.map((value, i) => ({ value, tone: tones[i] })),
  pointers,
});

const run = (id: string, label: string, text: string, tone?: Tone): ArrayStructure => ({
  kind: 'array',
  id,
  label,
  cells: text.split('').map((value) => ({ value, tone })),
});

const lr = (left: number, right: number): Pointer[] => [
  { id: 'left', at: left },
  { id: 'right', at: right },
];

const lesson: Lesson = {
  slug: 'valid-palindrome',
  title: 'Valid Palindrome',
  source: { leetcode: 125, name: 'Valid Palindrome' },
  pattern: 'Converging pointers',
  difficulty: 'easy',
  minutes: 8,
  youllLearn: [
    'What a palindrome check looks like with two pointers',
    'How to skip characters that do not count',
    'Why you compare lowercase versions of letters',
    'How to check in place without building a cleaned copy',
  ],

  problem: {
    statement: [
      'You are given a string `s` that may hold letters, digits, spaces and punctuation. Ignore everything that is not a letter or a digit, and ignore upper or lower case.',
      'Return `true` if what remains reads the same forwards and backwards, otherwise `false`. A string with nothing left to check counts as a palindrome.',
    ],
    examples: [
      { input: 's = "Race car!"', output: 'true', note: 'Only "racecar" is left, and it reads the same both ways.' },
      { input: 's = "0P"', output: 'false', note: 'Digits count, so "0" is compared with "p".' },
    ],
    constraints: [
      '0 <= s.length <= 200,000',
      's holds printable ASCII characters only.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'A palindrome reads the same in both directions. Here the string is `"Race car!"`, but spaces, punctuation and capital letters must not get in the way.',
        'Strip those away and you are left with `racecar`, which is a palindrome. So the answer is `true`.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's check it without building a cleaned copy." },
      scene: {
        structures: [str({ 4: 'muted', 8: 'muted' })],
        caption: 'The space (·) and ! do not count.',
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: clean, then reverse',
      body: [
        'The obvious plan: build a new string with only lowercase letters and digits, reverse it, and compare the two.',
        'It works and it is `O(n)` time, but it allocates two extra strings the size of the input. We can do the same check using just two positions in the original.',
      ],
      scene: {
        structures: [run('clean', 'clean', 'racecar', 'compare'), run('rev', 'reversed', 'racecar', 'compare')],
        caption: 'Two extra copies, just to compare them.',
      },
    },
    {
      kind: 'concept',
      title: 'Compare from both ends',
      body: [
        'A palindrome is mirrored, so the first character must equal the last, the second must equal the second to last, and so on.',
        'Put a pointer `left` at the start and `right` at the end, compare, then move both inward. Whenever a pointer lands on a character that does not count, step over it. Stop when they meet.',
      ],
      leet: { pose: 'hint', says: 'The pointers walk toward each other, so each character is visited once.' },
      scene: {
        structures: [str({ 0: 'active', 8: 'active' }, lr(0, 8))],
        vars: [{ name: 'left', value: 0 }, { name: 'right', value: 8 }],
      },
    },
    {
      kind: 'concept',
      title: 'Skip what does not count',
      body: [
        'Index 8 holds `!`, which is not a letter or a digit, so `right` cannot use it. Rule it out and move `right` one step left, to index 7.',
        'The same rule applies to `left`. Only characters that count ever get compared.',
      ],
      scene: {
        structures: [str({ 0: 'active', 7: 'active', 8: 'muted' }, lr(0, 7))],
        vars: [{ name: 'left', value: 0 }, { name: 'right', value: 7 }],
        caption: '! is skipped, so right moves to 7.',
      },
    },
    {
      kind: 'concept',
      title: 'Compare in lowercase',
      body: [
        'Now `left` sees `R` and `right` sees `r`. They are different characters, but the problem ignores case, so compare their lowercase forms: `r` and `r`.',
        'They match, so move both pointers inward.',
      ],
      scene: {
        structures: [str({ 0: 'good', 7: 'good', 8: 'muted' }, lr(0, 7))],
        vars: [{ name: 'left', value: 0 }, { name: 'right', value: 7 }],
        caption: 'R and r match once lowercased.',
      },
    },
    {
      kind: 'concept',
      title: 'Walk inward',
      body: [
        'Next pairs: `a` with `a`, then `c` with `c`. Both match, so nothing is ruled out and the pointers keep closing in.',
        'Now `left` is at index 2 and `right` is at index 5. Everything outside them has been confirmed.',
      ],
      scene: {
        structures: [str({ 0: 'good', 1: 'good', 2: 'compare', 5: 'compare', 6: 'good', 7: 'good', 8: 'muted' }, lr(2, 5))],
        vars: [{ name: 'left', value: 2 }, { name: 'right', value: 5 }],
        caption: 'c and c match as well.',
      },
    },
    {
      kind: 'concept',
      title: 'Skip again, then meet',
      body: [
        'Move inward once more: `left` is 3 on `e`, `right` is 4 on the space (the · cell). The space does not count, so skip it and `right` becomes 3.',
        'The pointers now sit on the same character. A lone middle character always matches itself, so the loop ends with `true`.',
      ],
      scene: {
        structures: [
          str({ 0: 'good', 1: 'good', 2: 'good', 3: 'good', 4: 'muted', 5: 'good', 6: 'good', 7: 'good', 8: 'muted' }, lr(3, 3)),
        ],
        vars: [{ name: 'left', value: 3 }, { name: 'right', value: 3 }, { name: 'result', value: 'true', tone: 'good' }],
        caption: 'left meets right, so s is a palindrome.',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `is_palindrome` (Python) or `isPalindrome` (JS / TS) using two pointers on the original string. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You checked a mirrored string by walking two pointers toward each other, never building a cleaned copy.'],
      takeaways: [
        '**Mirrors mean two pointers.** Compare the ends and close in until `left` meets or passes `right`.',
        '**Skip, do not delete.** Move a pointer past characters that do not count instead of building a new string.',
        '**Normalise at compare time.** Lowercase both characters just before comparing them.',
        '**Digits count.** A check that only looks at letters will get `"0P"` wrong.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
    },
  ],

  challenge: {
    entry: { python: 'is_palindrome', typescript: 'isPalindrome' },
    params: [{ name: 's', type: 'json' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def is_palindrome(s: str) -> bool:
    # Return True if s reads the same both ways, ignoring case and non-alphanumerics.
    pass
`,
      typescript: `function isPalindrome(s: string): boolean {
  // Return true if s reads the same both ways, ignoring case and non-alphanumerics.
  return false;
}
`,
    },
    solution: {
      python: `def is_palindrome(s: str) -> bool:
    left, right = 0, len(s) - 1
    while left < right:
        if not s[left].isalnum():
            left += 1
        elif not s[right].isalnum():
            right -= 1
        elif s[left].lower() != s[right].lower():
            return False
        else:
            left += 1
            right -= 1
    return True
`,
      typescript: `function isPalindrome(s: string): boolean {
  const isAlnum = (c: string) => /[a-zA-Z0-9]/.test(c);
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (!isAlnum(s[left])) {
      left++;
    } else if (!isAlnum(s[right])) {
      right--;
    } else if (s[left].toLowerCase() !== s[right].toLowerCase()) {
      return false;
    } else {
      left++;
      right--;
    }
  }
  return true;
}
`,
    },
    tests: [
      { name: 'worked example', args: ['Race car!'], expected: true },
      { name: 'digit versus letter', args: ['0P'], expected: false },
      { name: 'empty string', args: [''], expected: true },
      { name: 'punctuation and spaces', args: ['.,! ?'], expected: true },
      { name: 'must skip spaces and commas', args: ['ab, ba'], expected: true },
      { name: 'case difference', args: ['Aa'], expected: true },
      { name: 'underscore is skipped', args: ['ab_a'], expected: true },
      { name: 'mismatch after skipping', args: ['ab, ca'], expected: false },
    ],
    hints: [
      'Start one pointer at each end of the string and move them toward each other.',
      'If a pointer sits on a character that is not a letter or digit, move just that pointer and look again.',
      'When both pointers sit on real characters, compare their lowercase forms. A mismatch means `false`.',
    ],
  },
};

export default lesson;
