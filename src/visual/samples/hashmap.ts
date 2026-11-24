// Gallery samples for the hashmap layout: a counting map whose values change, a set filled from
// an array (tokens fly), and a lookup that hits.
import type { HashMapStructure, Scene, Tone } from '../../content/schema';
import type { Sample } from './types';

const WORD = 'banana'.split('');

function countScenes(): Scene[] {
  const out: Scene[] = [];
  const counts = new Map<string, number>();
  WORD.forEach((ch, i) => {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
    out.push({
      structures: [
        { kind: 'array', id: 's', label: 's', cells: WORD.map((value, k) => ({ value, tone: (k === i ? 'active' : k < i ? 'visited' : 'idle') as Tone })), pointers: [{ id: 'i', at: i }] },
        { kind: 'hashmap', id: 'count', label: 'count (char → n)', entries: [...counts].map(([key, value]) => ({ key, value, tone: (key === ch ? 'active' : 'idle') as Tone })) },
      ],
      vars: [{ name: 'i', value: i }],
    });
  });
  return out.slice(0, 5);
}

const SEEN = [4, 7, 2, 7];
const set = (keys: number[], tones: Partial<Record<number, Tone>> = {}): HashMapStructure => ({
  kind: 'hashmap',
  id: 'seen',
  label: 'seen',
  entries: keys.map((key) => ({ key, tone: tones[key] })),
});

const samples: Sample[] = [
  { title: 'Counting map (values pop)', scenes: countScenes() },
  {
    title: 'Set: find the first repeat',
    scenes: [
      ...[0, 1, 2].map((i) => ({
        structures: [
          { kind: 'array' as const, id: 'nums', label: 'nums', cells: SEEN.map((value, k) => ({ value, tone: (k === i ? 'active' : k < i ? 'visited' : 'idle') as Tone })), pointers: [{ id: 'i', at: i }] },
          set(SEEN.slice(0, i + 1), { [SEEN[i]]: 'active' }),
        ],
        vars: [{ name: 'x', value: SEEN[i], tone: 'bad' as Tone }],
        caption: `${SEEN[i]} is new. Add it to the set.`,
      })),
      {
        structures: [
          { kind: 'array' as const, id: 'nums', label: 'nums', cells: SEEN.map((value, k) => ({ value, tone: (k === 3 ? 'good' : 'visited') as Tone })), pointers: [{ id: 'i', at: 3 }] },
          set([4, 7, 2], { 7: 'good' }),
        ],
        vars: [{ name: 'x', value: 7, tone: 'good' as Tone }],
        caption: '7 is already in the set.',
      },
    ],
  },
  {
    title: 'Flows between elements',
    scenes: [
      {
        structures: [
          { kind: 'array', id: 'src', label: 'queue in', cells: [{ value: 'a', tone: 'active' }, 'b', 'c'] },
          { kind: 'hashmap', id: 'dst', label: 'store', entries: [{ key: 'x', value: 1 }, { key: 'y', value: 2 }] },
        ],
        flows: [
          { from: 'src/0', to: 'dst/x', tone: 'active' },
          { from: 'src/2', to: 'dst/y', tone: 'compare' },
        ],
        caption: 'Scene.flows: tokens loop along each flow while idle.',
      },
      {
        structures: [
          { kind: 'array', id: 'src', label: 'queue in', cells: ['a', { value: 'b', tone: 'active' }, 'c'] },
          { kind: 'hashmap', id: 'dst', label: 'store', entries: [{ key: 'x', value: 1 }, { key: 'y', value: 2, tone: 'good' }] },
        ],
        flows: [{ from: 'src/1', to: 'dst/y', tone: 'good', loop: false }],
        caption: 'loop: false flies one token on entry.',
      },
    ],
  },
];

export default samples;
