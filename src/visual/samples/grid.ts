// Gallery samples for the grid layout: a flood fill spreading over an island (land 1 at h = 1, water
// a blank flat h = 0 tile; filled land is `good`, not the see-through `visited`) and counting
// islands with a scanning pointer, each island muting once counted.
import type { CellInput, GridStructure, Scene, Tone } from '../../content/schema';
import type { Sample } from './types';

const MAP = ['000000', '011000', '011101', '001001', '101100', '100000'].map((r) => r.split('').map(Number));
const key = (r: number, c: number) => `${r},${c}`;

function grid(tone: (r: number, c: number) => Tone | undefined, pointers: GridStructure['pointers'] = [], label = 'grid'): GridStructure {
  const rows: CellInput[][] = MAP.map((row, r) =>
    row.map((v, c) => {
      const t = v ? tone(r, c) : undefined;
      return { value: v ? 1 : '', h: v ? 1 : 0, tone: t };
    }),
  );
  return { kind: 'grid', id: 'g', label, rows, pointers };
}

/** BFS layers of the island holding (sr, sc), 4-connected. */
function layers(sr: number, sc: number): string[][] {
  const seen = new Set([key(sr, sc)]);
  const out: string[][] = [[key(sr, sc)]];
  while (true) {
    const next: string[] = [];
    for (const k of out[out.length - 1]) {
      const [r, c] = k.split(',').map(Number);
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (MAP[nr]?.[nc] === 1 && !seen.has(key(nr, nc))) {
          seen.add(key(nr, nc));
          next.push(key(nr, nc));
        }
      }
    }
    if (!next.length) return out;
    out.push(next);
  }
}

function floodScenes(): Scene[] {
  const ls = layers(1, 1);
  const depth = new Map<string, number>();
  ls.forEach((l, d) => l.forEach((k) => depth.set(k, d)));
  const scenes: Scene[] = [];
  for (let k = 0; k <= ls.length; k++) {
    const done = k === ls.length;
    let filled = 0;
    ls.slice(0, k + 1).forEach((l) => (filled += l.length));
    scenes.push({
      structures: [
        grid(
          (r, c) => {
            const d = depth.get(key(r, c));
            if (d === undefined) return undefined;
            if (done) return 'good';
            return d < k ? 'good' : d === k ? 'active' : undefined;
          },
          k === 0 ? [{ id: 'start', at: [1, 1] }] : [],
        ),
      ],
      vars: [
        { name: 'wave', value: done ? ls.length - 1 : k, tone: done ? 'good' : 'active' },
        { name: 'filled', value: filled, tone: 'good' },
      ],
      caption: k === 0 ? 'Start the fill on land at (1, 1).' : done ? 'No land left to reach. The island is filled.' : `Wave ${k}: spread to ${ls[k].length} neighbouring land cell${ls[k].length > 1 ? 's' : ''}.`,
    });
  }
  return scenes;
}

function islandOf(r: number, c: number): Set<string> {
  return new Set(layers(r, c).flat());
}

function countScenes(): Scene[] {
  const islands = [islandOf(1, 1), islandOf(2, 5), islandOf(4, 0)];
  const starts: [number, number][] = [[1, 1], [2, 5], [4, 0]];
  const steps: { at: [number, number]; found: number; caption: string }[] = [
    { at: [0, 0], found: 0, caption: 'Scan the grid row by row for land.' },
    { at: starts[0], found: 1, caption: 'Land at (1, 1). Flood it: island 1.' },
    { at: starts[1], found: 2, caption: 'Skip counted land. New land at (2, 5): island 2.' },
    { at: starts[2], found: 3, caption: 'New land at (4, 0): island 3.' },
    { at: [5, 5], found: 3, caption: 'Scan done. Three islands.' },
  ];
  return steps.map(({ at, found, caption }, i) => {
    const last = i === steps.length - 1;
    return {
      structures: [
        grid(
          (r, c) => {
            const idx = islands.findIndex((s) => s.has(key(r, c)));
            if (idx < 0 || idx >= found) return undefined;
            return idx === found - 1 && !last ? 'good' : 'muted';
          },
          [{ id: 'scan', at, tone: last ? 'good' : 'active' }],
        ),
      ],
      vars: [{ name: 'islands', value: found, tone: last ? 'good' : found ? 'active' : undefined }],
      caption,
    };
  });
}

const samples: Sample[] = [
  { title: 'Flood fill an island', scenes: floodScenes() },
  { title: 'Count islands (scan and mute)', scenes: countScenes() },
];

export default samples;
