import type { Lesson, QueueStructure, Tone, TreeStructure, Var } from '../schema';

// Tree: 8 at the top, 4 and 11 below it, then 2, 6 (under 4) and 14 (under 11).
const VALUES: Record<string, number> = { n8: 8, n4: 4, n11: 11, n2: 2, n6: 6, n14: 14 };
const SUBS: Record<string, string> = { n8: 'L0', n4: 'L1', n11: 'L1', n2: 'L2', n6: 'L2', n14: 'L2' };

const tree = (tones: Record<string, Tone> = {}, subs: string[] = []): TreeStructure => ({
  kind: 'tree',
  id: 'tree',
  label: 'tree',
  root: 'n8',
  nodes: [
    { id: 'n8', left: 'n4', right: 'n11' },
    { id: 'n4', left: 'n2', right: 'n6' },
    { id: 'n11', right: 'n14' },
    { id: 'n2' },
    { id: 'n6' },
    { id: 'n14' },
  ].map((n) => ({
    ...n,
    value: VALUES[n.id],
    tone: tones[n.id],
    sub: subs.includes(n.id) ? SUBS[n.id] : undefined,
  })),
});

const queue = (ids: string[]): QueueStructure => ({
  kind: 'queue',
  id: 'queue',
  label: 'queue',
  items: ids.map((id) => ({ id: 'q' + id.slice(1), value: VALUES[id] })),
});

const vars = (size: number | string, level: string, levelTone?: Tone): Var[] => [
  { name: 'size', value: size },
  { name: 'level', value: level, tone: levelTone },
];

const lesson: Lesson = {
  slug: 'binary-tree-level-order-traversal',
  title: 'Binary Tree Level Order Traversal',
  source: { leetcode: 102, name: 'Binary Tree Level Order Traversal' },
  pattern: 'BFS with a queue',
  difficulty: 'medium',
  minutes: 10,
  youllLearn: [
    'What breadth-first search is and how it differs from depth-first',
    'Using a queue so nodes are visited top to bottom',
    'Snapshotting the queue length to separate one level from the next',
    'Building a list of lists, one inner list per level',
  ],

  problem: {
    statement: [
      'You are given the root of a binary tree. Return the values of its nodes grouped by depth, as a list of lists.',
      'The first inner list holds the root, the next holds the root\'s children, and so on down the tree. Inside each level, list the values from left to right. An empty tree gives an empty list.',
    ],
    examples: [
      {
        input: 'root = [8, 4, 11, 2, 6, null, 14]',
        output: '[[8], [4, 11], [2, 6, 14]]',
        note: 'Three levels, each read left to right.',
      },
      { input: 'root = [5]', output: '[[5]]', note: 'A single node is one level.' },
    ],
    constraints: [
      '0 <= number of nodes <= 2,000',
      '-1,000 <= node value <= 1,000',
      'The tree is given in level order, with null for a missing child.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'You get a binary tree and must report it **one level at a time**: the top node, then everything one step down, then everything two steps down, always left to right.',
        'For this tree the answer is `[[8], [4, 11], [2, 6, 14]]`. Each inner list is one row of the picture.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's read this tree row by row." },
      scene: {
        structures: [tree()],
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: one walk per level',
      body: [
        'One idea: for depth 0, walk the whole tree and keep nodes at that depth. Then walk it again for depth 1, then depth 2.',
        'It works, but every walk touches the whole tree, so a tree with `h` levels costs about `n * h` work. A tall, thin tree makes that painful.',
      ],
      scene: {
        structures: [tree({ n8: 'visited', n4: 'active', n11: 'active' })],
        vars: [{ name: 'depth', value: 1, tone: 'active' }],
        caption: 'Walking the whole tree for depth 1',
      },
    },
    {
      kind: 'concept',
      title: 'A queue plus a size snapshot',
      body: [
        'Use a **queue** of nodes waiting for their turn. Take from the front, add children at the back. Parents always leave before their children, so rows come out in order.',
        'To split the rows, read `size = len(queue)` when a level starts. That many nodes belong to this level. Anything added during it waits for the next.',
      ],
      leet: { pose: 'hint', says: 'The queue length at the start of a level is exactly how many nodes that level has.' },
      scene: {
        structures: [tree({ n8: 'active' }), queue(['n8'])],
        vars: vars(1, '[]'),
        caption: 'Level 0 starts: size is 1',
      },
    },
    {
      kind: 'concept',
      title: 'Level 0: just the root',
      body: [
        'Start with the root in the queue. `size` is 1, so take one node: 8. Put 8 in `level`.',
        'Then add its children, 4 and 11, to the back of the queue. The level is done, so `level` joins the result and starts empty again.',
      ],
      scene: {
        structures: [tree({ n8: 'visited' }, ['n8']), queue(['n4', 'n11'])],
        vars: vars(1, '8'),
        caption: 'Root out, its two children in',
      },
    },
    {
      kind: 'concept',
      title: 'Level 1: halfway through',
      body: [
        '`size` is now 2, so this level takes exactly two nodes. The first is 4: take it from the front and add it to `level`.',
        'Then queue its children, 2 and 6, at the back. 11 is still waiting at the front, with 2 and 6 behind it.',
      ],
      scene: {
        structures: [tree({ n8: 'visited', n4: 'active' }, ['n8']), queue(['n11', 'n2', 'n6'])],
        vars: vars(2, '4'),
        caption: '4 is out, 2 and 6 queued behind 11',
      },
    },
    {
      kind: 'concept',
      title: 'Level 1 done, level 2 queued',
      body: [
        'The second node of the level is 11. Take it, add it to `level`, and queue its only child, 14. `level` is now `4, 11`.',
        'Two nodes were taken, matching `size`, so the level is finished. The queue holds the whole next row: 2, 6, 14.',
      ],
      scene: {
        structures: [tree({ n8: 'visited', n4: 'visited', n11: 'visited' }, ['n8', 'n4', 'n11']), queue(['n2', 'n6', 'n14'])],
        vars: vars(2, '4,11'),
        caption: 'Next row is waiting in the queue',
      },
    },
    {
      kind: 'concept',
      title: 'Level 2: the leaves',
      body: [
        '`size` is 3, so take 2, 6 and 14 in turn. None of them has children, so nothing new enters the queue.',
        'The queue is empty, so the loop ends. `level` holds `2, 6, 14` and the result is `[[8], [4, 11], [2, 6, 14]]`.',
      ],
      scene: {
        structures: [
          tree({ n8: 'visited', n4: 'visited', n11: 'visited', n2: 'visited', n6: 'visited', n14: 'visited' }, [
            'n8', 'n4', 'n11', 'n2', 'n6', 'n14',
          ]),
          queue([]),
        ],
        vars: vars(3, '2,6,14', 'good'),
        caption: 'Queue empty, all three levels done',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `level_order` (Python) or `levelOrder` (JS / TS) using a queue and the size snapshot. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You visited a tree row by row by letting a queue hold the nodes that are waiting.'],
      takeaways: [
        '**Queue means breadth first.** First in, first out keeps parents ahead of their children.',
        '**Snapshot the size.** Read `len(queue)` before the level loop so new children do not leak in.',
        '**One inner list per level.** Build `level`, then append it to the result.',
        '**Guard the empty tree.** Return an empty list before touching the queue.',
      ],
      complexity: { time: 'O(n)', space: 'O(n)' },
    },
  ],

  challenge: {
    entry: { python: 'level_order', typescript: 'levelOrder' },
    params: [{ name: 'root', type: 'tree' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def level_order(root: Optional[TreeNode]) -> list[list[int]]:
    # Return the node values grouped by level, left to right.
    pass
`,
      typescript: `function levelOrder(root: TreeNode | null): number[][] {
  // Return the node values grouped by level, left to right.
  return [];
}
`,
    },
    solution: {
      python: `def level_order(root: Optional[TreeNode]) -> list[list[int]]:
    if root is None:
        return []
    result = []
    queue = deque([root])
    while queue:
        size = len(queue)
        level = []
        for _ in range(size):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
`,
      typescript: `function levelOrder(root: TreeNode | null): number[][] {
  if (root === null) return [];
  const result: number[][] = [];
  let queue: TreeNode[] = [root];
  while (queue.length > 0) {
    const size = queue.length;
    const level: number[] = [];
    const next: TreeNode[] = [];
    for (let i = 0; i < size; i++) {
      const node = queue[i];
      level.push(node.val as number);
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    result.push(level);
    queue = next;
  }
  return result;
}
`,
    },
    tests: [
      { name: 'worked example', args: [[8, 4, 11, 2, 6, null, 14]], expected: [[8], [4, 11], [2, 6, 14]] },
      { name: 'single node', args: [[5]], expected: [[5]] },
      { name: 'empty tree', args: [[]], expected: [] },
      { name: 'full tree, flat list would fail', args: [[1, 2, 3, 4, 5, 6, 7]], expected: [[1], [2, 3], [4, 5, 6, 7]] },
      { name: 'gaps in the middle of a level', args: [[10, 2, 3, null, 4, 5, null, null, null, 7]], expected: [[10], [2, 3], [4, 5], [7]] },
      { name: 'left-only chain', args: [[4, 3, null, 2, null, 1]], expected: [[4], [3], [2], [1]] },
      { name: 'negative values', args: [[-1, -5, 0, null, -2]], expected: [[-1], [-5, 0], [-2]] },
    ],
    hints: [
      'Keep a queue of nodes that are waiting. Start it with the root, and return an empty list if there is no root.',
      'At the top of each pass, store the current queue length. Process exactly that many nodes into one `level` list.',
      'For each node you take, add its left child and then its right child to the queue if they exist.',
    ],
  },
};

export default lesson;
