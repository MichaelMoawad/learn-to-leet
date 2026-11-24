// Gallery samples for the graph layout: a course-schedule topological order on a directed graph
// (edge tones change as edges are processed) and a breadth-first search on an undirected graph
// with visited tones and edge labels.
import type { GraphStructure, Scene, Tone } from '../../content/schema';
import type { Sample } from './types';

type E = GraphStructure['edges'][number];

const COURSES: { id: string; at: [number, number] }[] = [
  { id: '0', at: [0, 0] },
  { id: '1', at: [0, 2] },
  { id: '2', at: [1, 1] },
  { id: '3', at: [2, 0] },
  { id: '4', at: [2, 2] },
  { id: '5', at: [3, 1] },
];
const PREREQS: [string, string][] = [
  ['0', '2'],
  ['1', '2'],
  ['2', '3'],
  ['2', '4'],
  ['3', '5'],
  ['4', '5'],
];

/** Kahn's algorithm, one course taken per step. */
function topoScenes(): Scene[] {
  const order = ['0', '1', '2', '3', '4', '5'];
  const out: Scene[] = [];
  for (let k = 0; k <= order.length; k++) {
    const taken = new Set(order.slice(0, k));
    const justTaken = order[k - 1];
    const indeg = new Map(COURSES.map((c) => [c.id, PREREQS.filter(([a, b]) => b === c.id && !taken.has(a)).length]));
    const done = k === order.length;
    const nodes = COURSES.map((c) => {
      let tone: Tone = 'idle';
      if (taken.has(c.id)) tone = done ? 'good' : c.id === justTaken ? 'active' : 'visited';
      else if (indeg.get(c.id) === 0) tone = 'compare';
      return { ...c, value: c.id, tone };
    });
    const edges: E[] = PREREQS.map(([from, to]) => ({
      from,
      to,
      tone: from === justTaken && !done ? 'active' : taken.has(from) ? 'visited' : 'idle',
    }));
    const ready = COURSES.filter((c) => !taken.has(c.id) && indeg.get(c.id) === 0).map((c) => c.id);
    out.push({
      structures: [{ kind: 'graph', id: 'g', label: 'prereqs', directed: true, nodes, edges }],
      vars: [
        { name: 'taken', value: k, tone: done ? 'good' : 'active' },
        { name: 'ready', value: ready.join(' ') || 'none', tone: 'compare' },
      ],
      caption: k === 0 ? 'Courses with no prerequisites are ready.' : done ? `Order: ${order.join(', ')}.` : `Take ${justTaken}. Its outgoing edges drop in-degrees.`,
    });
  }
  return out;
}

const PLACES: { id: string; at: [number, number] }[] = [
  { id: 'A', at: [0, 1] },
  { id: 'B', at: [1, 0] },
  { id: 'C', at: [1, 2] },
  { id: 'D', at: [2, 1] },
  { id: 'E', at: [3, 0] },
  { id: 'F', at: [3, 2] },
];
const ROADS: [string, string][] = [
  ['A', 'B'],
  ['A', 'C'],
  ['B', 'D'],
  ['C', 'D'],
  ['D', 'E'],
  ['D', 'F'],
  ['E', 'F'],
];

/** BFS from A. Each step pops one node; `use` are edges examined this step with their labels. */
const BFS: { pop?: string; queue: string[]; use: Record<string, string>; caption: string }[] = [
  { queue: ['A'], use: {}, caption: 'Start at A. It is the only node in the queue.' },
  { pop: 'A', queue: ['B', 'C'], use: { 'A-B': '1', 'A-C': '1' }, caption: 'Pop A. B and C are one step away.' },
  { pop: 'B', queue: ['C', 'D'], use: { 'B-D': '2' }, caption: 'Pop B. D is two steps away.' },
  { pop: 'C', queue: ['D'], use: { 'C-D': 'seen' }, caption: 'Pop C. D is already seen, skip it.' },
  { pop: 'D', queue: ['E', 'F'], use: { 'D-E': '3', 'D-F': '3' }, caption: 'Pop D. E and F are three steps away.' },
  { pop: 'E', queue: ['F'], use: { 'E-F': 'seen' }, caption: 'Pop E. F is already in the queue.' },
  { pop: 'F', queue: [], use: {}, caption: 'Pop F. Queue empty, every node reached.' },
];

function bfsScenes(): Scene[] {
  const visited = new Set<string>();
  const tree = new Set<string>();
  return BFS.map(({ pop, queue, use, caption }, i) => {
    if (pop) visited.add(pop);
    const last = i === BFS.length - 1;
    const nodes = PLACES.map((p) => ({
      ...p,
      tone: (last ? 'good' : p.id === pop ? 'active' : visited.has(p.id) ? 'visited' : queue.includes(p.id) ? 'compare' : 'idle') as Tone,
    }));
    const edges: E[] = ROADS.map(([from, to]) => {
      const key = `${from}-${to}`;
      const label = use[key];
      let tone: Tone = 'idle';
      if (label === 'seen') tone = 'muted';
      else if (label) tone = 'active';
      else if (tree.has(key)) tone = last ? 'good' : 'visited';
      return { from, to, tone, label };
    });
    for (const [key, label] of Object.entries(use)) if (label !== 'seen') tree.add(key);
    return {
      structures: [{ kind: 'graph' as const, id: 'g', label: 'roads', nodes, edges }],
      vars: [
        { name: 'queue', value: queue.join(' ') || 'empty', tone: 'compare' as Tone },
        { name: 'seen', value: visited.size + queue.length, tone: (last ? 'good' : 'active') as Tone },
      ],
      caption,
    };
  });
}

const samples: Sample[] = [
  { title: 'Course schedule (topological order)', scenes: topoScenes() },
  { title: 'BFS on an undirected graph', scenes: bfsScenes() },
];

export default samples;
