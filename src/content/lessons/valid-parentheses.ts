import type { ArrayStructure, Lesson, Pointer, StackStructure, Tone } from '../schema';

const S = '([{}])';
const CHARS = S.split('');

const text = (tones: Partial<Record<number, Tone>> = {}, pointers: Pointer[] = []): ArrayStructure => ({
  kind: 'array',
  id: 's',
  label: 's',
  cells: CHARS.map((value, i) => ({ value, tone: tones[i] })),
  pointers,
});

// Stack items carry the id of the array index they came from, so a push flies in and a pop removes the same block.
const waiting = (indices: number[], tones: Partial<Record<number, Tone>> = {}): StackStructure => ({
  kind: 'stack',
  id: 'stack',
  label: 'stack',
  beside: true,
  items: indices.map((i) => ({ id: `o${i}`, value: CHARS[i], tone: tones[i] })),
});

const lesson: Lesson = {
  slug: 'valid-parentheses',
  title: 'Valid Parentheses',
  source: { leetcode: 20, name: 'Valid Parentheses' },
  pattern: 'Stack matching',
  difficulty: 'easy',
  minutes: 8,
  youllLearn: [
    'Why counting brackets is not enough',
    'Spotting "last opened, first closed" as a stack problem',
    'Pushing openers and popping on a matching closer',
    'The edge cases: empty stack, leftover openers, wrong type',
  ],

  problem: {
    statement: [
      'You are given a string `s` made only of the six characters `(`, `)`, `[`, `]`, `{` and `}`.',
      'The string is **valid** when every opening bracket is closed by a bracket of the same type, and brackets close in the right order: the most recently opened one must be closed first. Return `true` if `s` is valid, otherwise `false`.',
    ],
    examples: [
      { input: 's = "([{}])"', output: 'true', note: 'Each bracket closes inside the one that opened before it.' },
      { input: 's = "([)]"', output: 'false', note: 'The `)` arrives while `[` is still the newest open bracket.' },
    ],
    constraints: [
      '0 <= s.length <= 10,000',
      '`s` contains only `(`, `)`, `[`, `]`, `{` and `}`',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'You get a string of brackets and must decide whether it is **balanced**. Every opener needs a closer of the same type, and they must nest properly, like boxes inside boxes.',
        'Here `s = "([{}])"` is balanced: `{}` sits inside `[]`, which sits inside `()`. But `"([)]"` is not, because the pairs cross over each other.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Order matters here, not just counts." },
      scene: {
        structures: [text()],
      },
    },
    {
      kind: 'concept',
      title: 'Counting is not enough',
      body: [
        'A first idea: count openers and closers and check they are equal. Our string has 3 of each, so it passes.',
        'But counts ignore order. The string `")("` has one of each and is clearly broken, and `"([)]"` also has equal counts. We need to remember *which* brackets are still open, and in what order.',
      ],
      scene: {
        structures: [text()],
        vars: [{ name: 'opens', value: 3 }, { name: 'closes', value: 3 }],
        caption: 'Equal counts say nothing about order.',
      },
    },
    {
      kind: 'concept',
      title: 'Last opened, first closed',
      body: [
        'Walk left to right. An opener cannot be checked yet, so it **waits**. When a closer appears, it must match the opener that was opened *most recently*.',
        'That is last in, first out, which is exactly a **stack**. Push each opener, and the top of the stack is always the bracket that must close next.',
      ],
      leet: { pose: 'hint', says: 'Whenever the newest thing must be handled first, think stack.' },
      scene: {
        structures: [
          text({ 0: 'visited', 1: 'active' }, [{ id: 'i', at: 1 }]),
          waiting([0, 1], { 1: 'active' }),
        ],
        caption: 'Openers wait. The newest is on top.',
      },
    },
    {
      kind: 'concept',
      title: 'Push every opener',
      body: [
        'At `i = 2` we read `{`. It is an opener, so it goes on the stack, now holding `(`, `[` and `{` with `{` on top.',
        'Nothing is checked yet. Openers never fail on their own, they just wait for their partner to arrive.',
      ],
      scene: {
        structures: [
          text({ 0: 'visited', 1: 'visited', 2: 'active' }, [{ id: 'i', at: 2 }]),
          waiting([0, 1, 2], { 2: 'active' }),
        ],
        caption: 'Push {. It is now on top.',
      },
    },
    {
      kind: 'concept',
      title: 'A closer meets the top',
      body: [
        'At `i = 3` we read `}`, a closer. Look at the top of the stack: it is `{`, the matching type, so this pair is good.',
        'If the stack had been empty, or the top had been `[` or `(`, we would stop and return `false` immediately. Here we pop `{` and move on.',
      ],
      scene: {
        structures: [
          text({ 0: 'visited', 1: 'visited', 2: 'good', 3: 'good' }, [{ id: 'i', at: 3 }]),
          waiting([0, 1, 2], { 2: 'good' }),
        ],
        caption: '} matches the top {.',
      },
    },
    {
      kind: 'concept',
      title: 'Empty stack means valid',
      body: [
        'We pop `{`. Then `]` at `i = 4` matches the new top `[`, and `)` at `i = 5` matches `(`. Each closer finds its partner on top.',
        'The string is finished and the stack is empty, so nothing is left waiting. Return `true`. If any opener had remained, the answer would be `false`.',
      ],
      scene: {
        structures: [
          text({ 0: 'good', 1: 'good', 2: 'good', 3: 'good', 4: 'good', 5: 'good' }, [{ id: 'i', at: 5 }]),
          waiting([]),
        ],
        vars: [{ name: 'valid', value: 'true', tone: 'good' }],
        caption: 'Stack empty, so the string is valid.',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `is_valid` (Python) or `isValid` (JS / TS) using a stack of open brackets. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You replaced a broken counting idea with a stack that remembers which brackets are still open, newest on top.'],
      takeaways: [
        '**Order needs a stack.** When the newest item must be resolved first, push and pop.',
        '**Push openers, check closers.** A closer must match the top, or the string is invalid.',
        '**Guard the empty stack.** A closer with nothing to match is an instant `false`.',
        '**Check the leftovers.** Valid only if the stack is empty at the end.',
      ],
      complexity: { time: 'O(n)', space: 'O(n)' },
    },
  ],

  challenge: {
    entry: { python: 'is_valid', typescript: 'isValid' },
    params: [{ name: 's', type: 'json' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def is_valid(s: str) -> bool:
    # Return True if every bracket in s is closed by the right type, in the right order.
    pass
`,
      typescript: `function isValid(s: string): boolean {
  // Return true if every bracket in s is closed by the right type, in the right order.
  return false;
}
`,
    },
    solution: {
      python: `def is_valid(s: str) -> bool:
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack
`,
      typescript: `function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: string[] = [];
  for (const ch of s) {
    if (ch in pairs) {
      if (stack.length === 0 || stack.pop() !== pairs[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}
`,
    },
    tests: [
      { name: 'worked example', args: ['([{}])'], expected: true },
      { name: 'interleaved wrong order', args: ['([)]'], expected: false },
      { name: 'empty string', args: [''], expected: true },
      { name: 'lone opener', args: ['('], expected: false },
      { name: 'lone closer', args: [')'], expected: false },
      { name: 'deep nesting', args: ['{{[()]}}'], expected: true },
      { name: 'equal counts, wrong order', args: [')('], expected: false },
      { name: 'side by side pairs', args: ['()[]{}'], expected: true },
    ],
    hints: [
      'Openers cannot be checked yet. Store them somewhere and come back when a closer shows up.',
      'Push each opener onto a stack. For a closer, the top of the stack must be its matching opener.',
      'Return false if the stack is empty when a closer arrives, and check that the stack is empty at the end.',
    ],
  },
};

export default lesson;
