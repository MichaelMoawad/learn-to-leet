// Gallery samples, one file per structure kind (`<kind>.ts` default-exporting Sample[]), loaded
// with import.meta.glob so new kinds (linkedList, tree, graph, grid) only add a file.
import type { Sample } from './types';

export type { Sample } from './types';

const mods = import.meta.glob<{ default: Sample[] }>(['./*.ts', '!./index.ts', '!./types.ts'], { eager: true });

const ORDER = ['lessons', 'array', 'hashmap', 'stack', 'queue', 'linkedList', 'tree', 'graph', 'grid'];

export const sampleGroups: { kind: string; samples: Sample[] }[] = Object.entries(mods)
  .map(([path, mod]) => ({ kind: path.replace(/^\.\/|\.ts$/g, ''), samples: mod.default ?? [] }))
  .filter((g) => g.samples.length)
  .sort((a, b) => (ORDER.indexOf(a.kind) + 1 || 99) - (ORDER.indexOf(b.kind) + 1 || 99));
