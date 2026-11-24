import type { Lesson, LinkedListStructure, Pointer, Tone } from '../schema';

const VALS = [3, 8, 5, 1, 7];

const list = (
  values: number[],
  tones: Partial<Record<number, Tone>> = {},
  pointers: Pointer[] = [],
  id = 'list',
): LinkedListStructure => ({
  kind: 'linkedList',
  id,
  label: 'list',
  nodes: values.map((value, i) => ({ id: `n${i}`, value, tone: tones[i] })),
  pointers,
});

const lesson: Lesson = {
  slug: 'middle-of-the-linked-list',
  title: 'Middle of the Linked List',
  source: { leetcode: 876, name: 'Middle of the Linked List' },
  pattern: 'Fast and slow pointers',
  difficulty: 'easy',
  minutes: 7,
  youllLearn: [
    'Why counting the length costs a second pass',
    'How two pointers at different speeds find the middle',
    'Which node to return when the length is even',
    'The loop condition that keeps fast safe',
  ],

  problem: {
    statement: [
      'You are given the head of a singly linked list. Return the **middle node** of the list.',
      'If the list has two middle nodes (an even length), return the **second** of them. The checker shows the list from the node you return to the end.',
    ],
    examples: [
      { input: 'head = [3, 8, 5, 1, 7]', output: '[5, 1, 7]', note: 'Five nodes, so the middle is the third one, 5.' },
      { input: 'head = [6, 1, 4, 8, 2, 5]', output: '[8, 2, 5]', note: 'Two middles, 4 and 8. Return the second.' },
    ],
    constraints: ['1 <= number of nodes <= 100', '1 <= node value <= 100'],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'A linked list has no indexes. You only hold the `head` and follow `next` one node at a time, so you cannot jump to the middle.',
        'For `[3, 8, 5, 1, 7]` the middle is the third node, 5. You return that node, and everything after it comes along.',
      ],
      leet: { pose: 'idle', says: 'No indexes here. Let us find the middle by walking.' },
      scene: {
        structures: [list(VALS, {}, [{ id: 'head', at: 'n0' }])],
      },
    },
    {
      kind: 'concept',
      title: 'Naive: count, then walk',
      body: [
        'The direct plan: walk the whole list once to count the nodes. Here that gives `length = 5`.',
        'Then walk again, `length // 2 = 2` steps from the head, and you land on the middle. It is correct, but you traverse the list twice.',
      ],
      scene: {
        structures: [list(VALS, { 0: 'visited', 1: 'visited', 2: 'active' }, [{ id: 'walk', at: 'n2' }])],
        vars: [{ name: 'length', value: 5 }, { name: 'steps', value: 2, tone: 'active' }],
        caption: 'Pass one counts. Pass two walks half.',
      },
    },
    {
      kind: 'concept',
      title: 'Insight: a tortoise and a hare',
      body: [
        'Start two pointers at the head. `slow` moves one node per turn and `fast` moves two.',
        'When `fast` has covered the whole list, `slow` has covered exactly half of it. So `slow` is standing on the middle, and one pass is enough.',
      ],
      leet: { pose: 'hint', says: 'Twice the speed means half the distance. That is the whole trick.' },
      scene: {
        structures: [list(VALS, { 0: 'active' }, [{ id: 'slow', at: 'n0' }, { id: 'fast', at: 'n0' }])],
        caption: 'Both start on the head.',
      },
    },
    {
      kind: 'concept',
      title: 'Turn one',
      body: [
        '`slow` steps one node to 8. `fast` steps two, over 8 and onto 5.',
        'The node `fast` has not reached yet is the unknown. We keep going while `fast` still has somewhere to jump.',
      ],
      scene: {
        structures: [list(VALS, { 0: 'visited', 1: 'active' }, [{ id: 'slow', at: 'n1' }, { id: 'fast', at: 'n2' }])],
        vars: [{ name: 'slow', value: 8, tone: 'active' }, { name: 'fast', value: 5 }],
      },
    },
    {
      kind: 'concept',
      title: 'Turn two',
      body: [
        '`slow` steps to 5. `fast` steps two again, over 1 and onto 7, the last node.',
        'The nodes `fast` jumped over are marked as visited. `fast.next` is now null, so `fast` cannot take another full jump.',
      ],
      scene: {
        structures: [
          list(VALS, { 0: 'visited', 1: 'visited', 2: 'active', 3: 'visited' }, [
            { id: 'slow', at: 'n2' },
            { id: 'fast', at: 'n4' },
          ]),
        ],
        vars: [{ name: 'slow', value: 5, tone: 'active' }, { name: 'fast', value: 7 }],
        caption: 'fast.next is null, so we stop.',
      },
    },
    {
      kind: 'concept',
      title: 'Stop and return slow',
      body: [
        'The loop runs `while fast and fast.next`. Here `fast.next` is null, so it ends and `slow` sits on 5, the middle.',
        'Return that node. The list from it onward is `[5, 1, 7]`. We touched each node once, so no second pass.',
      ],
      scene: {
        structures: [
          list(VALS, { 0: 'visited', 1: 'visited', 2: 'good', 3: 'visited' }, [
            { id: 'slow', at: 'n2' },
            { id: 'fast', at: 'n4' },
          ]),
        ],
        vars: [{ name: 'slow', value: 5, tone: 'good' }],
        caption: 'slow is the middle node.',
      },
    },
    {
      kind: 'concept',
      title: 'Even length: the second middle',
      body: [
        'Take `[3, 8, 5, 1]`. After one turn `slow` is on 8 and `fast` is on 5. `fast.next` exists, so we take one more turn.',
        '`slow` moves to 5 and `fast` falls off the end as null. The loop stops with `slow` on the second of the two middles, which is what we want.',
      ],
      scene: {
        structures: [list([3, 8, 5, 1], { 0: 'visited', 1: 'visited', 2: 'good' }, [{ id: 'slow', at: 'n2' }], 'even')],
        vars: [{ name: 'slow', value: 5, tone: 'good' }, { name: 'fast', value: 'null', tone: 'bad' }],
        caption: 'Four nodes: slow ends on the second middle.',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `middle_node` (Python) or `middleNode` (JS / TS) with the `slow` and `fast` pointers. Return the node, not its value. Press **Run** to check.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['Two pointers at different speeds found the middle in a single pass, with no counting.'],
      takeaways: [
        '**Different speeds, one pass.** When `fast` moves two for every one of `slow`, `slow` is at the halfway point when `fast` finishes.',
        '**Loop on `fast and fast.next`.** Check both so `fast.next.next` never reads past the end.',
        '**Even lengths return the second middle.** This loop condition does that for free.',
        '**Spot the pattern.** Middle of a list, cycle detection and nth-from-end all lean on fast and slow pointers.',
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
      scene: {
        structures: [
          list(VALS, { 0: 'visited', 1: 'visited', 2: 'good', 3: 'visited' }, [
            { id: 'slow', at: 'n2' },
            { id: 'fast', at: 'n4' },
          ]),
        ],
        vars: [{ name: 'slow', value: 5, tone: 'good' }],
      },
    },
  ],

  challenge: {
    entry: { python: 'middle_node', typescript: 'middleNode' },
    params: [{ name: 'head', type: 'linkedList' }],
    returns: 'linkedList',
    compare: 'exact',
    starter: {
      python: `def middle_node(head: Optional[ListNode]) -> Optional[ListNode]:
    # Return the middle node (the second middle if the length is even).
    pass
`,
      typescript: `function middleNode(head: ListNode | null): ListNode | null {
  // Return the middle node (the second middle if the length is even).
  return null;
}
`,
    },
    solution: {
      python: `def middle_node(head: Optional[ListNode]) -> Optional[ListNode]:
    slow = head
    fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow
`,
      typescript: `function middleNode(head: ListNode | null): ListNode | null {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow;
}
`,
    },
    tests: [
      { name: 'worked example', args: [[3, 8, 5, 1, 7]], expected: [5, 1, 7] },
      { name: 'six nodes', args: [[6, 1, 4, 8, 2, 5]], expected: [8, 2, 5] },
      { name: 'single node', args: [[4]], expected: [4] },
      { name: 'two nodes returns the second', args: [[2, 9]], expected: [9] },
      { name: 'four nodes, not the first middle', args: [[1, 2, 3, 4]], expected: [3, 4] },
      { name: 'three nodes', args: [[7, 7, 7]], expected: [7, 7] },
    ],
    hints: [
      'Start two pointers at the head. Move one a single node per turn and the other two nodes per turn.',
      'Keep looping while `fast` exists and `fast.next` exists, so the double step never runs off the end.',
      'When the loop ends, `slow` is on the middle. Return the node itself.',
    ],
  },
};

export default lesson;
