// Screen geometry of every spec, shared by the renderer (so pixels match) and compose.ts (so the
// bounds check in check-content matches what is drawn). Pure, no DOM.
import { project } from './iso';
import type { BlockSpec, EdgeSpec, LabelSpec, MarkerSpec, Rect, ZoneSpec } from './types';

export type Pt = [number, number];

// Blocks are inset from their tile: half width 28 of 32, half height 14 of 16.
export const INSET_X = 4;
export const INSET_Y = 2;
const HW = 32 - INSET_X;

// Text sizes (px at scale 1).
export const VALUE_FONT = 16;
export const VALUE_FONT_SMALL = 12; // 4 characters
export const MONO_EM = 0.6; // JetBrains Mono advance per em
export const PILL_FONT = 13;
export const PILL_H = 22;
export const PILL_PAD = 10;
export const TITLE_LEAD = 26; // leader line length from anchor to pill (above)
export const TITLE_LEAD_BELOW = 18; // a pill hanging below needs less room
export const INDEX_FONT = 13;
export const SILK_EM = 0.92; // Silkscreen advance per em, tracking included (approx.)
export const NOTE_FONT = 11;
export const MARKER_PILL_H = 20;
export const MARKER_ARROW = 12;
export const BOB = 3; // idle bob amplitude, kept inside bounds

export const monoWidth = (text: string, size: number) => Math.ceil(text.length * size * MONO_EM);
export const silkWidth = (text: string, size: number) => Math.ceil(text.length * size * SILK_EM);

export const valueFont = (text: string) => (text.length >= 4 ? VALUE_FONT_SMALL : VALUE_FONT);

// `k` is the renderer's text boost (>= 1) that keeps small text legible when the view is scaled
// down on phones. Bounds are computed at k = 1; pills grow around their anchors.
export const pillWidth = (text: string, k = 1) => monoWidth(text, PILL_FONT * k) + PILL_PAD * 2;
export const markerWidth = (text: string, k = 1) => Math.max(MARKER_PILL_H, monoWidth(text, PILL_FONT * k) + 12);

/** Text boost for a view scale: small text (13px) stays at least 11px on screen, values at least 13.6px. */
export const textBoost = (scale: number) => Math.max(1, 0.85 / scale);

const rectOf = (pts: Pt[]): Rect => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

export function union(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** The four floor corners of a block's footprint (inset), relative to nothing: absolute screen px. */
export function blockCorners(b: Pick<BlockSpec, 'x' | 'y'>, z: number): { t: Pt; r: Pt; bt: Pt; l: Pt } {
  const [ox, oy] = project(b.x, b.y, z);
  return {
    t: [ox, oy + INSET_Y],
    r: [ox + HW, oy + 16],
    bt: [ox, oy + 32 - INSET_Y],
    l: [ox - HW, oy + 16],
  };
}

/** Centre of a block's top face (where its value sits and tokens land). */
export const blockTop = (b: Pick<BlockSpec, 'x' | 'y' | 'z' | 'h'>): Pt => project(b.x + 0.5, b.y + 0.5, b.z + b.h);

export function blockRect(b: BlockSpec): Rect {
  const top = blockCorners(b, b.z + b.h);
  const bottom = blockCorners(b, b.z);
  return rectOf([top.t, top.r, top.l, bottom.bt, bottom.l, bottom.r]);
}

/** Arrow tip of a marker; the pill sits above it. */
export const markerTip = (m: Pick<MarkerSpec, 'x' | 'y' | 'z'>): Pt => project(m.x, m.y, m.z);

export function markerRect(m: MarkerSpec): Rect {
  const [x, y] = markerTip(m);
  const w = markerWidth(m.text);
  const h = MARKER_ARROW + MARKER_PILL_H + 2 + BOB;
  return { x: x - w / 2 - 2, y: y - h, w: w + 4, h };
}

/** Pill box of a title label (absolute screen px) and its anchor. */
export function titleBox(l: LabelSpec, k = 1): { anchor: Pt; box: Rect } {
  const anchor = project(l.x, l.y);
  const w = pillWidth(l.text, k);
  const x = l.align === 'end' ? anchor[0] + 12 - w : anchor[0] - w / 2;
  const y = l.place === 'below' ? anchor[1] + TITLE_LEAD_BELOW : anchor[1] - TITLE_LEAD - PILL_H;
  return { anchor, box: { x, y, w, h: PILL_H } };
}

export function labelRect(l: LabelSpec): Rect {
  if (l.kind === 'title') {
    const { anchor, box } = titleBox(l);
    return union(box, { x: anchor[0] - 3, y: anchor[1] - 3, w: 6, h: 6 })!;
  }
  const [x, y] = project(l.x, l.y);
  const size = l.kind === 'index' ? INDEX_FONT : NOTE_FONT;
  const w = l.kind === 'index' ? silkWidth(l.text, size) : monoWidth(l.text, size);
  return { x: x - w / 2 - 2, y: y - size / 2 - 2, w: w + 4, h: size + 4 };
}

export function zoneCorners(z: ZoneSpec): Pt[] {
  return [project(z.x, z.y), project(z.x + z.w, z.y), project(z.x + z.w, z.y + z.d), project(z.x, z.y + z.d)];
}
export const zoneRect = (z: ZoneSpec): Rect => {
  const r = rectOf(zoneCorners(z));
  return { x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 6 };
};

export function edgeRect(e: EdgeSpec): Rect {
  const r = rectOf(e.points.map(([x, y]) => project(x, y)));
  let out: Rect = { x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 };
  if (e.label && e.points.length > 1) {
    const mid = edgeMid(e);
    const w = pillWidth(e.label);
    out = union(out, { x: mid[0] - w / 2, y: mid[1] - PILL_H / 2, w, h: PILL_H })!;
  }
  return out;
}

/** Screen midpoint along an edge polyline (for its label). */
export function edgeMid(e: Pick<EdgeSpec, 'points'>): Pt {
  const pts = e.points.map(([x, y]) => project(x, y));
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let half = seg.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < seg.length; i++) {
    if (half <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? half / seg[i] : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    }
    half -= seg[i];
  }
  return pts[0];
}

// Leet: feet at the tile centre, about 48px tall with its shadow.
export const LEET_W = 38;
export const LEET_H = 54;
export function leetRect(sx: number, sy: number): Rect {
  return { x: sx - LEET_W / 2, y: sy - LEET_H, w: LEET_W, h: LEET_H + 6 };
}

