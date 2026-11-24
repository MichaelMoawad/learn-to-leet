// Gallery samples for the tree layout: breadth-first search lighting the tree level by level, and a
// depth-first max depth with returned depths as `sub` notes and a pointer moving down and back up.
import type { Scene, Tone, TreeStructure } from '../../content/schema';
import type { Sample } from './types';

type N = TreeStructure['nodes'][number];

// 8, 4, 12, 2, 6, 10, 14, 1: four levels, eight nodes.
const BFS_NODES: N[] = [
  { id: 'n8', value: 8, left: 'n4', right: 'n12' },
  { id: 'n4', value: 4, left: 'n2', right: 'n6' },
  { id: 'n12', value: 12, left: 'n10', right: 'n14' },
  { id: 'n2', value: 2, left: 'n1' },
  { id: 'n6', value: 6 },
  { id: 'n10', value: 10 },
  { id: 'n14', value: 14 },
  { id: 'n1', value: 1 },
];
const LEVELS = [['n8'], ['n4', 'n12'], ['n2', 'n6', 'n10', 'n14'], ['n1']];

function bfsScenes(): Scene[] {
  const out: Scene[] = [];
  for (let k = 0; k <= LEVELS.length; k++) {
    const level = new Map<string, number>();
    LEVELS.forEach((ids, d) => ids.forEach((id) => level.set(id, d)));
    const done = k === LEVELS.length;
    const nodes = BFS_NODES.map((n) => {
      const d = level.get(n.id)!;
      const tone: Tone = done ? 'good' : d < k ? 'visited' : d === k ? 'active' : 'idle';
      return { ...n, tone };
    });
    out.push({
      structures: [{ kind: 'tree', id: 't', label: 'root', root: 'n8', nodes }],
      vars: [
        { name: 'level', value: done ? LEVELS.length : k, tone: done ? 'good' : 'active' },
        { name: 'queue', value: done ? 0 : LEVELS[k].length },
      ],
      caption: done ? 'Queue empty. Four levels visited.' : `Level ${k}: visit ${LEVELS[k].length} node${LEVELS[k].length > 1 ? 's' : ''}, queue their children.`,
    });
  }
  return out;
}

// 3, 9, 20, 4, 15, 7, 5: the deepest leaf (5) sits under 20 > 15.
const DFS_NODES: N[] = [
  { id: 'r', value: 3, left: 'a', right: 'b' },
  { id: 'a', value: 9, left: 'c' },
  { id: 'b', value: 20, left: 'd', right: 'e' },
  { id: 'c', value: 4 },
  { id: 'd', value: 15, right: 'f' },
  { id: 'e', value: 7 },
  { id: 'f', value: 5 },
];

/** at: the node being looked at; path: nodes on the call stack; ret: depths returned so far. */
const DFS_STEPS: { at: string; path: string[]; ret: Record<string, number>; caption: string }[] = [
  { at: 'r', path: [], ret: {}, caption: 'Start at the root and go left first.' },
  { at: 'c', path: ['r', 'a'], ret: { c: 1 }, caption: '4 is a leaf. It returns depth 1.' },
  { at: 'a', path: ['r'], ret: { c: 1, a: 2 }, caption: 'Back up: 9 returns 1 + 1 = 2.' },
  { at: 'f', path: ['r', 'b', 'd'], ret: { c: 1, a: 2, f: 1 }, caption: 'Down the right side to leaf 5.' },
  { at: 'd', path: ['r', 'b'], ret: { c: 1, a: 2, f: 1, d: 2, e: 1 }, caption: '15 returns 2, and leaf 7 returns 1.' },
  { at: 'b', path: ['r'], ret: { c: 1, a: 2, f: 1, d: 2, e: 1, b: 3 }, caption: '20 returns max(2, 1) + 1 = 3.' },
  { at: 'r', path: [], ret: { c: 1, a: 2, f: 1, d: 2, e: 1, b: 3, r: 4 }, caption: 'The root returns max(2, 3) + 1 = 4.' },
];

function dfsScenes(): Scene[] {
  return DFS_STEPS.map(({ at, path, ret, caption }, i) => {
    const last = i === DFS_STEPS.length - 1;
    const nodes = DFS_NODES.map((n) => {
      let tone: Tone = 'idle';
      if (n.id in ret) tone = 'visited';
      if (path.includes(n.id)) tone = 'compare';
      if (n.id === at) tone = last ? 'good' : 'active';
      return { ...n, tone, sub: n.id in ret ? `d=${ret[n.id]}` : undefined };
    });
    return {
      structures: [{ kind: 'tree' as const, id: 't', label: 'root', root: 'r', nodes, pointers: [{ id: 'node', at, tone: (last ? 'good' : 'active') as Tone }] }],
      vars: [
        { name: 'stack', value: path.length + 1 },
        { name: 'max', value: Math.max(0, ...Object.values(ret)), tone: (last ? 'good' : 'compare') as Tone },
      ],
      caption,
    };
  });
}

const samples: Sample[] = [
  { title: 'BFS level by level', scenes: bfsScenes() },
  { title: 'DFS max depth (sub notes)', scenes: dfsScenes() },
];

export default samples;
