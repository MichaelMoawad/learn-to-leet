// Engine data types (SPEC 3.2). World coordinates are in tiles: x runs down-right on screen,
// y runs down-left, z is height in units (ZU px each). Layouts emit these with keys local to the
// structure (the element id); compose.ts prefixes them with `structure.id + '/'`.
import type { Structure, Tone } from '../content/schema';

/** A block fills the tile [x, x+1] by [y, y+1], starts z units above the floor and is h units tall. */
export interface BlockSpec {
  key: string;
  x: number;
  y: number;
  z: number;
  h: number;
  text: string;
  textOn: 'top' | 'side';
  /**
   * Horizontal offset of the top-face value, screen px at scale 1 (default 0, centred). Rows set
   * it to TEXT_LEFT when the cell in front is taller and would hide the right half of the face.
   */
  textDx?: number;
  sub?: string;
  tone: Tone;
  /** Hash map blocks say which half of an entry they are; lookups only match `key` blocks. */
  role?: 'key' | 'value';
}
/** Polyline on the floor, in world coordinates. */
export interface EdgeSpec {
  key: string;
  points: [number, number][];
  tone: Tone;
  arrow: boolean;
  label?: string;
  /** End cap: `arrow` (default when `arrow` is set), `cross` (null terminator, a pixel X) or `none`. */
  cap?: 'arrow' | 'cross' | 'none';
  /** Flow tokens along the edge. Default: true unless the tone is idle or muted. */
  flow?: boolean;
}
/** Floor rectangle. `plate` is a filled platform under a structure, `outline` a dashed bracket. */
export interface ZoneSpec {
  key: string;
  x: number;
  y: number;
  w: number;
  d: number;
  tone: Tone;
  style?: 'outline' | 'plate';
}
/** Pointer: a down arrow with a pill label floating above a floor point. (x, y, z) is the arrow tip. */
export interface MarkerSpec {
  key: string;
  x: number;
  y: number;
  z: number;
  text: string;
  tone: Tone;
  /** Local key of the block it points at, if any. Leet stands beside the first one. */
  for?: string;
}
/**
 * Upright text anchored to a floor point. `title` renders as a pill floating above (or below) the
 * anchor with a thin leader line; `tag` is the same pill centred on the anchor, no leader line;
 * `index` and `note` are small floor labels.
 */
export interface LabelSpec {
  key: string;
  x: number;
  y: number;
  text: string;
  kind: 'title' | 'tag' | 'index' | 'note';
  /** Local key of the block this label annotates (index labels). Tokens can fly from it. */
  for?: string;
  /** Titles only: float above the anchor (default) or hang below it. */
  place?: 'above' | 'below';
  /** Titles only: centre the pill on the anchor (default) or end it just right of the anchor. */
  align?: 'center' | 'end';
  /** Titles only: extra lift in px, set lesson-wide by compose so the pill clears its blocks. */
  rise?: number;
}

export interface LayoutResult {
  blocks: BlockSpec[];
  edges: EdgeSpec[];
  zones: ZoneSpec[];
  markers: MarkerSpec[];
  labels: LabelSpec[];
}

export type StructureKind = Structure['kind'];

/** After compose: keys are global (`sid/local`), coordinates include the structure offset. */
interface Owned {
  sid: string;
  skind: StructureKind;
}
export type CBlock = BlockSpec & Owned;
export type CEdge = EdgeSpec & Owned;
export type CZone = ZoneSpec & Owned;
export type CMarker = MarkerSpec & Owned;
export type CLabel = LabelSpec & Owned;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LeetPlacement {
  /** Floor tile (integer) Leet stands on; feet at the tile centre. */
  tx: number;
  ty: number;
  /** Screen position of the feet. */
  sx: number;
  sy: number;
  /** Key of the element Leet stands beside. */
  anchor: string;
}

export interface ResolvedFlow {
  key: string;
  from: [number, number];
  to: [number, number];
  tone: Tone;
  loop: boolean;
}

export interface ComposedScene {
  blocks: CBlock[]; // in draw order (back to front)
  edges: CEdge[];
  zones: CZone[];
  markers: CMarker[];
  labels: CLabel[];
  flows: ResolvedFlow[];
  /** Per structure: world offset applied and the screen box it occupies. */
  structures: { id: string; kind: StructureKind; offset: [number, number]; box: Rect }[];
  leet: LeetPlacement | null;
  bounds: Rect;
}
