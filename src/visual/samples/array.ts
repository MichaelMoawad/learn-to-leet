// Gallery samples for the array layout: plain, sliding window, bars, strings and a swap by id.
import type { ArrayStructure, Pointer, Tone } from '../../content/schema';
import type { Sample } from './types';

const arr = (values: (string | number)[], tones: Partial<Record<number, Tone>> = {}, pointers: Pointer[] = [], extra: Partial<ArrayStructure> = {}): ArrayStructure => ({
  kind: 'array',
  id: 'a',
  label: 'nums',
  cells: values.map((value, i) => ({ value, tone: tones[i] })),
  pointers,
  ...extra,
});

const SCAN = [3, 1, 4, 1, 5, 9];
const WIN = [2, 1, 5, 1, 3, 2];
const BARS = [1, 8, 6, 2, 5, 4, 8, 3];
const WORD = 'racecar'.split('');

const samples: Sample[] = [
  {
    title: 'Plain scan with a pointer',
    scenes: [0, 1, 2, 3].map((i) => ({
      structures: [arr(SCAN, { ...Object.fromEntries(Array.from({ length: i }, (_, k) => [k, 'visited'])), [i]: 'active' }, [{ id: 'i', at: i }])],
      vars: [{ name: 'i', value: i }, { name: 'max', value: Math.max(...SCAN.slice(0, i + 1)), tone: 'active' as Tone }],
      caption: `Look at nums[${i}].`,
    })),
  },
  {
    title: 'Sliding window',
    scenes: [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
    ].map(([a, b]) => ({
      structures: [arr(WIN, Object.fromEntries(WIN.map((_, k) => [k, k >= a && k <= b ? 'active' : k < a ? 'muted' : 'idle'])), [{ id: 'l', at: a }, { id: 'r', at: b }], { window: [a, b], label: 'window of 3' })],
      vars: [{ name: 'sum', value: WIN.slice(a, b + 1).reduce((x, y) => x + y, 0), tone: 'compare' as Tone }],
    })),
  },
  {
    title: 'Bars with two pointers',
    scenes: [
      [0, 7, 'compare'],
      [1, 7, 'compare'],
      [1, 6, 'good'],
    ].map(([l, r, tone]) => ({
      structures: [
        arr(BARS, Object.fromEntries(BARS.map((_, k) => [k, k === l || k === r ? (tone as Tone) : k < (l as number) || k > (r as number) ? 'muted' : 'idle'])), [{ id: 'l', at: l as number }, { id: 'r', at: r as number }], { variant: 'bars', label: 'height' }),
      ],
      vars: [
        { name: 'left', value: l as number },
        { name: 'right', value: r as number },
        { name: 'area', value: Math.min(BARS[l as number], BARS[r as number]) * ((r as number) - (l as number)), tone: tone as Tone },
      ],
    })),
  },
  {
    title: 'String as characters',
    scenes: [
      [0, 6],
      [1, 5],
      [2, 4],
      [3, 3],
    ].map(([l, r]) => ({
      structures: [
        arr(WORD, Object.fromEntries(WORD.map((_, k) => [k, k === l || k === r ? (l === r ? 'good' : 'compare') : k < l || k > r ? 'visited' : 'idle'])), l === r ? [{ id: 'mid', at: l }] : [{ id: 'l', at: l }, { id: 'r', at: r }], { label: 's' }),
      ],
      caption: l === r ? 'Pointers met: it is a palindrome.' : `s[${l}] and s[${r}] match.`,
    })),
  },
  {
    title: 'Swap by id (cells tween)',
    scenes: [
      ['a', 'b', 'c', 'd'],
      ['b', 'a', 'c', 'd'],
      ['b', 'c', 'a', 'd'],
    ].map((order, step) => ({
      structures: [
        {
          kind: 'array' as const,
          id: 'a',
          label: 'pass 1',
          cells: order.map((id) => ({ id, value: { a: 9, b: 2, c: 5, d: 11 }[id]!, tone: (step > 0 && (id === 'a' || id === order[step - 1]) ? 'compare' : 'idle') as Tone })),
        },
      ],
    })),
  },
];

export default samples;
