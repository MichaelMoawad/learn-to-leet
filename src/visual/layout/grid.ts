// grid (SPEC 3.3): cell (r, c) on tile (c, r), so rows run along x and each next row sits one tile
// in front. `h` from the cell (default 1), so land can be h = 1 and water a flat h = 0 tile.
// Pointer markers float above their cell. Element id is `cell.id`, else `r,c`.
// Grid cells never float (`active`) or flatten (`muted`): in a dense grid either would hide the
// tops of the neighbouring cells. Tones only change colour.
// `Cell.sub` is not drawn (layoutWithSubs skips grids): in a grid the floor in front of a cell is the next row's cell.
import type { GridStructure, Pointer } from '../../content/schema';
import type { LayoutResult } from '../types';
import { empty, normCell, pointerMarkers, toneBlock } from './common';

export const gridCellId = (cell: GridStructure['rows'][number][number], r: number, c: number) =>
  typeof cell === 'object' && cell.id ? cell.id : `${r},${c}`;

export function layoutGrid(s: GridStructure): LayoutResult {
  const out = empty();
  const ids = new Map<string, string>();
  s.rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      const n = normCell(cell);
      const key = gridCellId(cell, r, c);
      ids.set(`${r},${c}`, key);
      out.blocks.push(toneBlock({ key, x: c, y: r, h: n.h ?? 1, text: String(n.value), textOn: 'top', tone: n.tone }, { lift: false, flatten: false }));
    }),
  );
  const pointers: Pointer[] | undefined = s.pointers?.map((p) => ({ id: p.id, at: `${p.at[0]},${p.at[1]}`, tone: p.tone }));
  out.markers = pointerMarkers(pointers, out.blocks, (at) => ids.get(String(at)));
  // Hung below the grid's front corner: the only spot that adds no width (a 6 by 6 grid is already
  // 384px wide) and sits clear of every cell.
  const rows = s.rows.length;
  const cols = Math.max(0, ...s.rows.map((r) => r.length));
  if (s.label && rows) out.labels.push({ key: '#title', x: cols + 0.25, y: rows + 0.25, text: s.label, kind: 'title', place: 'below' });
  return out;
}

export default layoutGrid;
