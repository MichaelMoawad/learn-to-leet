// Gallery samples for the queue layout: enqueue and dequeue by id, and a fixed-size buffer.
import type { Tone } from '../../content/schema';
import type { Sample } from './types';

const q = (items: { id: string; value: string | number; tone?: Tone }[]) => ({ kind: 'queue' as const, id: 'q', label: 'queue', items });

const samples: Sample[] = [
  {
    title: 'Enqueue and dequeue',
    scenes: [
      { structures: [q([{ id: 'a', value: 'A' }])], caption: 'Start with A.' },
      { structures: [q([{ id: 'a', value: 'A' }, { id: 'b', value: 'B', tone: 'active' }])], caption: 'Enqueue B at the back.' },
      { structures: [q([{ id: 'a', value: 'A' }, { id: 'b', value: 'B' }, { id: 'c', value: 'C', tone: 'active' }])], caption: 'Enqueue C.' },
      { structures: [q([{ id: 'b', value: 'B', tone: 'active' }, { id: 'c', value: 'C' }])], caption: 'Dequeue A from the front. B moves up.' },
    ],
  },
  {
    title: 'Last three readings',
    scenes: [
      [{ id: 'r1', value: 12 }, { id: 'r2', value: 15 }, { id: 'r3', value: 11 }],
      [{ id: 'r2', value: 15 }, { id: 'r3', value: 11 }, { id: 'r4', value: 18, tone: 'active' as Tone }],
      [{ id: 'r3', value: 11 }, { id: 'r4', value: 18 }, { id: 'r5', value: 9, tone: 'active' as Tone }],
    ].map((items) => ({
      structures: [q(items)],
      vars: [{ name: 'avg', value: Math.round(items.reduce((a, b) => a + b.value, 0) / items.length), tone: 'compare' as Tone }],
    })),
  },
];

export default samples;
