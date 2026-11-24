// 2:1 isometric projection (SPEC 3.1, 3.2). Pure, shared by the renderer and check-content.
export const TW = 64, TH = 32, ZU = 16; // tile width, tile height, pixels per height unit
export const LIFT = 0.5;                // height units an active block floats above the floor

export const project = (x: number, y: number, z = 0): [number, number] =>
  [(x - y) * TW / 2, (x + y) * TH / 2 - z * ZU];

/** Floor point under a screen point. */
export const unproject = (sx: number, sy: number): [number, number] =>
  [sx / TW + sy / TH, sy / TH - sx / TW];

export type {
  BlockSpec, EdgeSpec, ZoneSpec, MarkerSpec, LabelSpec, LayoutResult, ComposedScene, Rect,
} from './types';
