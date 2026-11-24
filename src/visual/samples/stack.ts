// Gallery samples for the stack layout: brackets (push and pop) and a monotonic stack of indices.
import type { Scene, Tone } from '../../content/schema';
import type { Sample } from './types';

const S = '([{}])'.split('');

function brackets(): Scene[] {
  const out: Scene[] = [];
  const stack: { id: string; value: string }[] = [];
  S.forEach((ch, i) => {
    let tone: Tone = 'active';
    if ('([{'.includes(ch)) stack.push({ id: `b${i}`, value: ch });
    else {
      stack.pop();
      tone = 'good';
    }
    out.push({
      structures: [
        { kind: 'array', id: 's', label: 's', cells: S.map((value, k) => ({ value, tone: (k === i ? tone : k < i ? 'visited' : 'idle') as Tone })), pointers: [{ id: 'i', at: i }] },
        { kind: 'stack', id: 'st', label: 'stack', beside: true, items: stack.map((x, k) => ({ id: x.id, value: x.value, tone: (k === stack.length - 1 ? 'active' : 'idle') as Tone })) },
      ],
      caption: tone === 'good' ? `${ch} closes the top. Pop.` : `${ch} opens. Push.`,
    });
  });
  return out;
}

const T = [73, 74, 75, 71, 69, 72];
const samples: Sample[] = [
  { title: 'Brackets: push and pop', scenes: brackets() },
  {
    title: 'Monotonic stack (beside)',
    scenes: [
      { items: [{ id: 'i0', value: 73 }], i: 0 },
      { items: [{ id: 'i1', value: 74 }], i: 1 },
      { items: [{ id: 'i2', value: 75 }, { id: 'i3', value: 71 }], i: 3 },
      { items: [{ id: 'i2', value: 75 }, { id: 'i3', value: 71 }, { id: 'i4', value: 69 }], i: 4 },
      { items: [{ id: 'i2', value: 75 }, { id: 'i5', value: 72, tone: 'good' as Tone }], i: 5 },
    ].map(({ items, i }) => ({
      structures: [
        { kind: 'array' as const, id: 't', label: 'temps', cells: T.map((value, k) => ({ value, tone: (k === i ? 'active' : k < i ? 'visited' : 'idle') as Tone })), pointers: [{ id: 'i', at: i }] },
        { kind: 'stack' as const, id: 'st', label: 'waiting', beside: true, items },
      ],
      vars: [{ name: 'i', value: i }],
    })),
  },
];

export default samples;
