// Gallery samples for the linkedList layout: reversing a list in place (rewired `next` arrows route
// backward along the front lane) and fast and slow pointers to the middle (null stub at the end).
import type { LinkedListStructure, Pointer, Scene, Tone } from '../../content/schema';
import type { Sample } from './types';

const IDS = ['a', 'b', 'c', 'd', 'e'];
const VALS = [1, 2, 3, 4, 5];

/** Reverse: after k rewires, nodes 0..k-1 point backward, node 0 points at null. */
function reverseScenes(): Scene[] {
  const out: Scene[] = [];
  for (let k = 0; k <= IDS.length; k++) {
    const curr = k < IDS.length ? k : -1;
    const prev = k - 1;
    const nodes: LinkedListStructure['nodes'] = IDS.map((id, i) => {
      let tone: Tone = 'idle';
      if (i === curr) tone = 'active';
      else if (i < k) tone = 'visited';
      const next = i < k ? (i === 0 ? null : IDS[i - 1]) : undefined;
      return { id, value: VALS[i], tone, next };
    });
    const pointers: Pointer[] = [];
    if (prev >= 0) pointers.push({ id: 'prev', at: IDS[prev], tone: 'compare' });
    if (curr >= 0) pointers.push({ id: 'curr', at: IDS[curr] });
    if (curr >= 0 && curr + 1 < IDS.length) pointers.push({ id: 'nxt', at: IDS[curr + 1], tone: 'idle' });
    if (curr < 0) nodes[IDS.length - 1].tone = 'good';
    out.push({
      structures: [{ kind: 'linkedList', id: 'list', label: 'list', nodes, pointers }],
      vars: [
        { name: 'prev', value: prev >= 0 ? VALS[prev] : 'null', tone: 'compare' },
        { name: 'curr', value: curr >= 0 ? VALS[curr] : 'null', tone: curr >= 0 ? 'active' : 'good' },
      ],
      caption:
        k === 0
          ? 'Start: prev is null, curr is the head.'
          : curr < 0
            ? 'curr is null. prev is the new head.'
            : `Point ${VALS[k - 1]} back at ${k === 1 ? 'null' : VALS[k - 2]}, then step forward.`,
    });
  }
  return out;
}

/** Fast moves two, slow moves one; when fast cannot move, slow is the middle. */
function middleScenes(): Scene[] {
  const steps = [
    { slow: 0, fast: 0 },
    { slow: 1, fast: 2 },
    { slow: 2, fast: 4 },
    { slow: 2, fast: 4, done: true },
  ];
  return steps.map(({ slow, fast, done }) => ({
    structures: [
      {
        kind: 'linkedList' as const,
        id: 'list',
        label: 'head',
        nodes: IDS.map((id, i) => ({
          id,
          value: VALS[i] * 10,
          tone: (done && i === slow ? 'good' : i === slow ? 'active' : i === fast ? 'compare' : i < slow ? 'visited' : 'idle') as Tone,
        })),
        pointers: [
          { id: 'slow', at: IDS[slow], tone: (done ? 'good' : 'active') as Tone },
          { id: 'fast', at: IDS[fast], tone: 'compare' as Tone },
        ],
      },
    ],
    vars: [
      { name: 'slow', value: VALS[slow] * 10, tone: (done ? 'good' : 'active') as Tone },
      { name: 'fast', value: VALS[fast] * 10, tone: 'compare' as Tone },
    ],
    caption: done ? 'fast.next is null. slow is the middle.' : slow === 0 ? 'Both start at the head.' : 'slow moves one, fast moves two.',
  }));
}

const samples: Sample[] = [
  { title: 'Reverse in place (backward arcs)', scenes: reverseScenes() },
  { title: 'Fast and slow to the middle', scenes: middleScenes() },
];

export default samples;
