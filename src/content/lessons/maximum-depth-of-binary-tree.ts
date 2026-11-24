import type { Lesson, StackStructure, Tone, TreeStructure } from '../schema';

type NodeState = { tone?: Tone; sub?: string };
type Id = 'n8' | 'n4' | 'n11' | 'n9' | 'n14';

const VALUES: Record<Id, number> = { n8: 8, n4: 4, n11: 11, n9: 9, n14: 14 };

const tree = (state: Partial<Record<Id, NodeState>> = {}): TreeStructure => {
  const node = (id: Id, links: { left?: string; right?: string } = {}) => ({
    id,
    value: VALUES[id],
    ...links,
    tone: state[id]?.tone,
    sub: state[id]?.sub,
  });
  return {
    kind: 'tree',
    id: 'tree',
    label: 'tree',
    root: 'n8',
    nodes: [
      node('n8', { left: 'n4', right: 'n11' }),
      node('n4'),
      node('n11', { left: 'n9', right: 'n14' }),
      node('n9'),
      node('n14'),
    ],
  };
};

// One frame per call. The top frame is the call running now.
const calls = (ids: Id[]): StackStructure => ({
  kind: 'stack',
  id: 'calls',
  label: 'calls',
  items: ids.map((id, i) => ({
    id: 'f' + VALUES[id],
    value: VALUES[id],
    tone: i === ids.length - 1 ? ('active' as Tone) : undefined,
  })),
});

const lesson: Lesson = {
  slug: 'maximum-depth-of-binary-tree',
  title: 'Maximum Depth of Binary Tree',
  source: { leetcode: 104, name: 'Maximum Depth of Binary Tree' },
  pattern: 'Recursive DFS',
  difficulty: 'easy',
  minutes: 8,
  youllLearn: [
    'How to trust a recursive call to solve a smaller tree',
    'Why an empty tree gives the base case 0',
    'Reading the call stack as the walk down and back up',
    'Combining child answers with 1 + max(left, right)',
  ],

  problem: {
    statement: [
      'You are given the root of a binary tree. Return its **depth**: the number of nodes on the longest path that starts at the root and ends at a leaf.',
      'An empty tree has depth 0, and a tree with only a root has depth 1.',
    ],
    examples: [
      { input: 'root = [8, 4, 11, null, null, 9, 14]', output: '3', note: 'The path 8, 11, 9 has three nodes.' },
      { input: 'root = []', output: '0', note: 'An empty tree has no nodes.' },
    ],
    constraints: [
      'The tree has between 0 and 10,000 nodes.',
      '-100 <= node.val <= 100',
      'The input is given in level-order, with null for a missing child.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'You get the root of a binary tree and must return how many nodes sit on its **longest root-to-leaf path**.',
        'In this tree the left side stops after the 4, while the right side keeps going through 11 and then 9 or 14. The longest path has three nodes, so the answer is 3.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's measure this tree without tracking any paths by hand." },
      scene: {
        structures: [tree()],
        caption: 'Longest path: 8, 11, 9 (3 nodes)',
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: measure every path',
      body: [
        'One plan: list every root-to-leaf path, count the nodes on each, and keep the biggest. The path 8, 4 has 2 nodes so far.',
        'It works, but you restart from the root for every leaf, repeat the shared top nodes each time, and have to carry the whole path around. There is a simpler way to ask the question.',
      ],
      scene: {
        structures: [tree({ n8: { tone: 'active' }, n4: { tone: 'active' } })],
        vars: [{ name: 'best', value: 2 }],
        caption: 'Path 8, 4 has 2 nodes',
      },
    },
    {
      kind: 'concept',
      title: 'Ask each node for its depth',
      body: [
        'Let `depth(node)` be the depth of the tree that starts at that node. A node is one level plus its deeper child: `depth(node) = 1 + max(depth(left), depth(right))`.',
        'A missing child is an empty tree, so `depth(null) = 0`. For leaf 14 both children are null, giving `1 + max(0, 0) = 1`.',
      ],
      leet: { pose: 'hint', says: 'Trust the recursive call. Each child hands back its own answer.' },
      scene: {
        structures: [tree({ n14: { tone: 'active' } })],
        vars: [
          { name: 'left', value: 0 },
          { name: 'right', value: 0 },
          { name: 'depth', value: 1, tone: 'active' },
        ],
        caption: 'Leaf: 1 + max(0, 0) = 1',
      },
    },
    {
      kind: 'concept',
      title: 'Down to the first leaf',
      body: [
        'The recursion goes left first. `dfs(8)` calls `dfs(4)`, so the stack holds two frames. Node 4 has no children, so both calls return 0.',
        'It returns `1 + max(0, 0) = 1`. The frame for 4 pops off the stack and hands that 1 back to its caller.',
      ],
      scene: {
        structures: [tree({ n4: { tone: 'active' } }), calls(['n8', 'n4'])],
        vars: [
          { name: 'left', value: 0 },
          { name: 'right', value: 0 },
          { name: 'depth', value: 1, tone: 'active' },
        ],
        caption: 'dfs(4) returns 1 and pops',
      },
    },
    {
      kind: 'concept',
      title: 'Down the right side',
      body: [
        'Back in `dfs(8)`, the left answer is 1 (node 4 now shows `d1`). Now it calls `dfs(11)`, which calls `dfs(9)`, so the stack is three frames deep.',
        'Node 9 is a leaf and returns 1. Node 14 does the same, so both children of 11 report 1.',
      ],
      scene: {
        structures: [
          tree({ n4: { tone: 'visited', sub: 'd1' }, n9: { tone: 'active' } }),
          calls(['n8', 'n11', 'n9']),
        ],
        vars: [
          { name: 'left', value: 0 },
          { name: 'right', value: 0 },
          { name: 'depth', value: 1, tone: 'active' },
        ],
        caption: 'Stack is 3 deep at the leaf 9',
      },
    },
    {
      kind: 'concept',
      title: 'Back up through 11 and 8',
      body: [
        'Both children of 11 gave 1, so node 11 returns `1 + max(1, 1) = 2`. Its frame pops.',
        'At the root, `left` is 1 from node 4 and `right` is 2 from node 11. So `depth = 1 + max(1, 2) = 3`, and the deeper right side wins.',
      ],
      leet: { pose: 'cheer', says: 'One call per node, and the stack unwinds into the answer.' },
      scene: {
        structures: [
          tree({
            n8: { tone: 'good', sub: 'd3' },
            n4: { tone: 'visited', sub: 'd1' },
            n11: { tone: 'good', sub: 'd2' },
            n9: { tone: 'good', sub: 'd1' },
            n14: { tone: 'visited', sub: 'd1' },
          }),
          calls(['n8']),
        ],
        vars: [
          { name: 'left', value: 1 },
          { name: 'right', value: 2 },
          { name: 'depth', value: 3, tone: 'good' },
        ],
        caption: 'depth = 1 + max(1, 2) = 3',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `max_depth` (Python) or `maxDepth` (JS / TS). Return 0 for an empty tree, otherwise one plus the deeper child. Press **Run** to check your code.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You measured the tree by letting each node ask its two children for their depth.'],
      takeaways: [
        '**Pick the base case first.** An empty tree has depth 0.',
        '**Trust the recursive call.** Assume `depth(child)` is right and combine the answers.',
        '**Combine on the way back up.** Each node returns `1 + max(left, right)`.',
        '**The call stack is the path.** Its height is as deep as the tree, so a long stick of nodes is a deep stack.',
      ],
      complexity: { time: 'O(n)', space: 'O(h)' },
    },
  ],

  challenge: {
    entry: { python: 'max_depth', typescript: 'maxDepth' },
    params: [{ name: 'root', type: 'tree' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def max_depth(root: Optional[TreeNode]) -> int:
    # Return the number of nodes on the longest root-to-leaf path.
    pass
`,
      typescript: `function maxDepth(root: TreeNode | null): number {
  // Return the number of nodes on the longest root-to-leaf path.
  return 0;
}
`,
    },
    solution: {
      python: `def max_depth(root: Optional[TreeNode]) -> int:
    if root is None:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
`,
      typescript: `function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
`,
    },
    tests: [
      { name: 'worked example', args: [[8, 4, 11, null, null, 9, 14]], expected: 3 },
      { name: 'empty tree', args: [[]], expected: 0 },
      { name: 'single node', args: [[5]], expected: 1 },
      { name: 'left-only stick', args: [[1, 2, null, 3, null, 4]], expected: 4 },
      { name: 'right-only stick', args: [[1, null, 2, null, 3]], expected: 3 },
      { name: 'deep leaf on the right', args: [[10, 3, 20, null, null, null, 25, null, 30]], expected: 4 },
    ],
    hints: [
      'An empty tree (a null node) has depth 0. Start with that base case.',
      'For a real node, ask both children for their depth with the same function.',
      'Return `1 + max(left, right)`. Do not follow only the left child.',
    ],
  },
};

export default lesson;
