import type { Lesson, LinkedListStructure, Pointer, Tone } from '../schema';

const VALUES = [4, 9, 2, 7];

// Rewired nexts are given by node id. A node with no entry keeps its default next (the following node).
const chain = (
  nexts: Record<string, string | null> = {},
  tones: Partial<Record<string, Tone>> = {},
  pointers: Pointer[] = [],
): LinkedListStructure => ({
  kind: 'linkedList',
  id: 'list',
  label: 'list',
  nodes: VALUES.map((value, i) => {
    const id = `n${i}`;
    return { id, value, tone: tones[id], ...(id in nexts ? { next: nexts[id] } : {}) };
  }),
  pointers,
});

const lesson: Lesson = {
  slug: 'reverse-linked-list',
  title: 'Reverse Linked List',
  source: { leetcode: 206, name: 'Reverse Linked List' },
  pattern: 'Pointer rewiring',
  difficulty: 'easy',
  minutes: 8,
  youllLearn: [
    'Why a linked list cannot be reversed by swapping positions',
    'How to flip one arrow at a time with three pointers',
    'Why you must save the next node before rewiring',
    'How to reverse a list in O(n) time and O(1) extra space',
  ],

  problem: {
    statement: [
      'You are given the head of a singly linked list. Reverse the list so every arrow points the other way, and return the new head.',
      'An empty list stays empty. In the tests a list is written as an array of its values, front to back.',
    ],
    examples: [
      { input: 'head = [4, 9, 2, 7]', output: '[7, 2, 9, 4]', note: 'The old last node becomes the head.' },
      { input: 'head = []', output: '[]', note: 'An empty list has nothing to reverse.' },
    ],
    constraints: [
      '0 <= list length <= 5,000',
      '-5,000 <= node value <= 5,000',
      'Each node holds a value `val` and a link `next`.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'A linked list is a chain of nodes. Each node holds a value and one arrow, `next`, to the node after it. You only ever hold the `head`.',
        'Here the list is `4 → 9 → 2 → 7`. After reversing it must read `7 → 2 → 9 → 4`, and you return the node holding 7.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. We will turn the arrows around, one at a time." },
      scene: {
        structures: [chain({}, {}, [{ id: 'head', at: 'n0' }])],
      },
    },
    {
      kind: 'concept',
      title: 'Naive: copy into an array',
      body: [
        'One idea: walk the list, copy the values into an array, then write them back in reverse order.',
        'It works, but it needs a second array as long as the list, so extra space grows with `n`. A linked list can do better, because reversing only needs the arrows to change.',
      ],
      scene: {
        structures: [
          chain({}, { n0: 'active' }),
          { kind: 'array', id: 'copy', label: 'copy', cells: VALUES.map((v, i) => ({ id: `c${i}`, value: v, tone: i === 0 ? 'active' : undefined })) },
        ],
        caption: 'Extra array: O(n) space.',
      },
    },
    {
      kind: 'concept',
      title: 'Flip arrows, not values',
      body: [
        'Leave the values where they are and point every `next` backwards. Walk the list with `curr`, and keep `prev`, the node you just finished. At the start `prev` is `null`.',
        'For each node, the new `next` is `prev`. The first node becomes the tail, so its arrow ends at `null`.',
      ],
      scene: {
        structures: [chain({}, { n0: 'active' }, [{ id: 'curr', at: 'n0' }])],
        vars: [{ name: 'prev', value: 'null' }],
      },
    },
    {
      kind: 'concept',
      title: 'Save the next node first',
      body: [
        'Before touching `curr.next`, save it in `nxt`. Here `nxt` is the node holding 9.',
        'If you rewired first, nothing would point at 9 any more. The whole rest of the list would be lost. Save `nxt`, and only then flip.',
      ],
      leet: { pose: 'hint', says: 'Rewire first and the rest of the list is gone for good.' },
      scene: {
        structures: [chain({}, { n0: 'active' }, [{ id: 'curr', at: 'n0' }, { id: 'nxt', at: 'n1' }])],
        vars: [{ name: 'prev', value: 'null' }],
        caption: 'nxt keeps the rest of the list safe.',
      },
    },
    {
      kind: 'concept',
      title: 'Flip, then step forward',
      body: [
        'Now set `curr.next = prev`. Node 4 points at `null`, so it is the tail. Then move both pointers along: `prev = curr` and `curr = nxt`.',
        'Node 4 is finished. `curr` is now on 9, and the old arrow into it no longer matters.',
      ],
      scene: {
        structures: [
          chain({ n0: null }, { n0: 'visited', n1: 'active' }, [{ id: 'prev', at: 'n0' }, { id: 'curr', at: 'n1' }]),
        ],
        caption: '4.next is now null. Move on.',
      },
    },
    {
      kind: 'concept',
      title: 'Repeat for the middle',
      body: [
        'Same three moves for 9 and then 2: save `nxt`, set `curr.next = prev`, advance. Now 9 points back at 4, and 2 points back at 9.',
        'The finished nodes form a reversed chain behind `prev`, and `curr` has reached the last node, 7.',
      ],
      scene: {
        structures: [
          chain(
            { n0: null, n1: 'n0', n2: 'n1' },
            { n0: 'visited', n1: 'visited', n2: 'visited', n3: 'active' },
            [{ id: 'prev', at: 'n2' }, { id: 'curr', at: 'n3' }],
          ),
        ],
      },
    },
    {
      kind: 'concept',
      title: 'The last node',
      body: [
        'At node 7, `nxt` is `null`. Set `curr.next = prev` so 7 points at 2, then advance. Now `prev` is on 7 and `curr` is `null`, so the loop ends.',
        'The new head is `prev`. Return it.',
      ],
      scene: {
        structures: [
          chain(
            { n0: null, n1: 'n0', n2: 'n1', n3: 'n2' },
            { n0: 'visited', n1: 'visited', n2: 'visited', n3: 'visited' },
            [{ id: 'prev', at: 'n3' }],
          ),
        ],
        vars: [{ name: 'curr', value: 'null' }],
        caption: 'curr is null, so prev is the new head.',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `reverse_list` (Python) or `reverseList` (JS / TS) with `prev`, `curr` and `nxt`. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You reversed the list in one pass by turning each arrow around, using no extra list or array.'],
      takeaways: [
        '**Change the arrows, not the values.** Each node ends up pointing at the one before it.',
        '**Three pointers.** `prev` is finished work, `curr` is the node in hand, `nxt` is the saved rest.',
        '**Save before you rewire.** Overwriting `curr.next` first would lose the rest of the list.',
        '**Return `prev`.** When `curr` is `null`, `prev` sits on the new head.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
      scene: {
        structures: [
          {
            kind: 'linkedList',
            id: 'list',
            label: 'list',
            nodes: [3, 2, 1, 0].map((i) => ({ id: `n${i}`, value: VALUES[i], tone: 'good' as Tone })),
            pointers: [{ id: 'head', at: 'n3' }],
          },
        ],
        vars: [{ name: 'prev', value: 7, tone: 'good' }],
        caption: 'Returned: 7 → 2 → 9 → 4.',
      },
    },
  ],

  challenge: {
    entry: { python: 'reverse_list', typescript: 'reverseList' },
    params: [{ name: 'head', type: 'linkedList' }],
    returns: 'linkedList',
    compare: 'exact',
    starter: {
      python: `def reverse_list(head: Optional[ListNode]) -> Optional[ListNode]:
    # Reverse the list and return the new head.
    pass
`,
      typescript: `function reverseList(head: ListNode | null): ListNode | null {
  // Reverse the list and return the new head.
  return null;
}
`,
    },
    solution: {
      python: `def reverse_list(head: Optional[ListNode]) -> Optional[ListNode]:
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev
`,
      typescript: `function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;
  while (curr) {
    const nxt: ListNode | null = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nxt;
  }
  return prev;
}
`,
    },
    tests: [
      { name: 'worked example', args: [[4, 9, 2, 7]], expected: [7, 2, 9, 4] },
      { name: 'empty list', args: [[]], expected: [] },
      { name: 'single node', args: [[5]], expected: [5] },
      { name: 'two nodes', args: [[1, 2]], expected: [2, 1] },
      { name: 'duplicate values', args: [[3, 3, 1, 3]], expected: [3, 1, 3, 3] },
      { name: 'negative values', args: [[-5, 0, -2, 8]], expected: [8, -2, 0, -5] },
    ],
    hints: [
      'Keep two pointers: `curr` for the node you are on and `prev` for the one you just finished. `prev` starts as null.',
      'Before changing `curr.next`, store it in `nxt`. Otherwise you lose the rest of the list.',
      'Each loop: save `nxt`, set `curr.next = prev`, then move `prev = curr` and `curr = nxt`. Return `prev`.',
    ],
  },
};

export default lesson;
