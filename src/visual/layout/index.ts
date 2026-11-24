// Dispatch a structure to its layout (SPEC 3.2 stage 1). Each layout is pure:
// (structure) => LayoutResult in world tiles, keys local to the structure.
import type { Structure } from '../../content/schema';
import type { LayoutResult } from '../types';
import { layoutArray } from './array';
import { layoutHashmap } from './hashmap';
import { layoutStack } from './stack';
import { layoutQueue } from './queue';
import { layoutLinkedList } from './linkedList';
import { layoutTree } from './tree';
import { layoutGraph } from './graph';
import { layoutGrid } from './grid';

/** Optional lesson-wide context from compose. `slots`: the most entries a hash map has in any step. */
export interface LayoutContext {
  slots?: number;
}

export function layoutStructure(s: Structure, ctx: LayoutContext = {}): LayoutResult {
  switch (s.kind) {
    case 'array':
      return layoutArray(s);
    case 'hashmap':
      return layoutHashmap(s, { slots: ctx.slots });
    case 'stack':
      return layoutStack(s);
    case 'queue':
      return layoutQueue(s);
    case 'linkedList':
      return layoutLinkedList(s);
    case 'tree':
      return layoutTree(s);
    case 'graph':
      return layoutGraph(s);
    case 'grid':
      return layoutGrid(s);
  }
}

export default layoutStructure;
