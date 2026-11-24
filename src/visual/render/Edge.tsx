// Floor edge: a polyline with an optional arrowhead and midpoint label pill. New edges draw from
// zero to full length in 200ms (SPEC 3.4). While idle, small glowing tokens flow along it.
import { motion } from 'motion/react';
import { project } from '../iso';
import { edgeMid, PILL_FONT, PILL_H, pillWidth, type Pt } from '../metrics';
import { C, FACES, IDLE_FACE } from '../tones';
import type { CEdge } from '../types';
import { COLOR, NONE, PATH, tr, useSceneMotion } from './context';

export const toneStroke = (tone: CEdge['tone']) => (tone === 'idle' || tone === 'muted' ? IDLE_FACE.rim : FACES[tone].accent);

/** Tokens stay this far (px) clear of an arrowhead. */
const HEAD_CLEAR = 14;
/** Edges shorter than this (px) carry a single token. */
const SHORT_EDGE = 80;

const segLen = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const polyLen = (pts: Pt[]) => pts.slice(1).reduce((n, p, i) => n + segLen(pts[i], p), 0);

/** Polyline with its last `cut` px removed (empty when nothing is left). */
export function trimEnd(pts: Pt[], cut: number): Pt[] {
  let left = polyLen(pts) - cut;
  if (left <= 1) return [];
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const l = segLen(pts[i - 1], pts[i]);
    if (l >= left) {
      const t = left / l;
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
      return out;
    }
    out.push(pts[i]);
    left -= l;
  }
  return out;
}

export const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('');

export function Edge({ e }: { e: CEdge }) {
  const { instant, reduced, k } = useSceneMotion();
  const pts = e.points.map(([x, y]) => project(x, y));
  const d = pathOf(pts);
  const color = toneStroke(e.tone);
  const move = tr(instant, PATH);
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] ?? pts[0];
  const ang = (Math.atan2(last[1] - prev[1], last[0] - prev[0]) * 180) / Math.PI;
  const mid = e.label ? edgeMid(e) : null;
  const cap = e.cap ?? (e.arrow ? 'arrow' : 'none');
  const flows = e.flow ?? (e.tone !== 'idle' && e.tone !== 'muted');
  const tokenPts = pts.length > 1 && flows && !reduced ? (cap === 'none' ? pts : trimEnd(pts, HEAD_CLEAR)) : [];
  const tokenCount = tokenPts.length > 1 && polyLen(tokenPts) + (cap === 'none' ? 0 : HEAD_CLEAR) < SHORT_EDGE ? 1 : 2;
  return (
    <motion.g data-edge={e.key} initial={{ opacity: 0 }} animate={{ opacity: e.tone === 'muted' ? 0.45 : 1 }} exit={{ opacity: 0, transition: instant ? NONE : { duration: 0.15 } }} transition={tr(instant, { duration: 0.15 })}>
      <motion.path
        initial={{ pathLength: 0, d }}
        animate={{ pathLength: 1, stroke: color, d }}
        transition={{ pathLength: tr(instant, { duration: 0.2 }), stroke: tr(instant, COLOR), d: move }}
        fill="none"
        strokeWidth={2}
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      {cap === 'arrow' && pts.length > 1 && (
        <g transform={`translate(${last[0]} ${last[1]}) rotate(${ang})`}>
          <path d="M0 0L-9 -5L-9 5Z" fill={color} stroke={C.ink} strokeWidth={1} />
        </g>
      )}
      {cap === 'cross' && (
        <g transform={`translate(${Math.round(last[0])} ${Math.round(last[1])})`} stroke={color} strokeWidth={2} strokeLinecap="butt" shapeRendering="crispEdges">
          <path d="M-4 -4L4 4M4 -4L-4 4" fill="none" />
        </g>
      )}
      {tokenPts.length > 1 && <FlowTokens d={pathOf(tokenPts)} color={color} count={tokenCount} r={2.5} />}
      {mid && e.label && (
        <g transform={`translate(${mid[0]} ${mid[1]})`}>
          <rect x={-pillWidth(e.label, k) / 2} y={-PILL_H / 2} width={pillWidth(e.label, k)} height={PILL_H} rx={PILL_H / 2} fill={C.bg1} stroke={color} strokeWidth={2} />
          <text textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono)" fontWeight={700} fontSize={PILL_FONT * k} fill={C.text}>
            {e.label}
          </text>
        </g>
      )}
    </motion.g>
  );
}

/** Two small glowing dots looping along a path (SMIL, paused with the scene). */
export function FlowTokens({ d, color, dur = 1.8, count = 2, r = 4 }: { d: string; color: string; dur?: number; count?: number; r?: number }) {
  return (
    <g className="ltl-flow" style={{ filter: `drop-shadow(0 0 3px ${color})` }}>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} r={r} fill={color} stroke={C.ink} strokeWidth={r < 4 ? 1 : 1.5}>
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} begin={`${(-dur * i) / count}s`} />
        </circle>
      ))}
    </g>
  );
}

export default Edge;
