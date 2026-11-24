// Dotted diamond floor grid, world-aligned (pattern origin is world (0, 0), so every block sits
// exactly on the lattice), filling the whole view and fading softly at the edges.
import { memo } from 'react';
import { TH, TW } from '../iso';
import { C } from '../tones';
import type { Rect } from '../types';

export const Floor = memo(function Floor({ view, glow, id }: { view: Rect; glow: Rect; id: string }) {
  const gx = glow.x + glow.w / 2;
  const gy = glow.y + glow.h / 2;
  const gr = Math.max(glow.w, glow.h) * 0.75 + 60;
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id={`${id}-grid`} patternUnits="userSpaceOnUse" x={0} y={0} width={TW} height={TH}>
          <path
            d={`M0 0L${TW} ${TH}M${TW} 0L0 ${TH}`}
            stroke={C.line}
            strokeWidth={1}
            strokeDasharray="2 4"
            fill="none"
            opacity={0.9}
          />
          {[
            [0, 0],
            [TW, 0],
            [0, TH],
            [TW, TH],
            [TW / 2, TH / 2],
          ].map(([x, y]) => (
            <rect key={`${x},${y}`} x={x - 1} y={y - 1} width={2} height={2} fill={C.lineBright} opacity={0.75} />
          ))}
        </pattern>
        <radialGradient id={`${id}-fade`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="62%" stopColor="#fff" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id={`${id}-mask`} maskContentUnits="userSpaceOnUse">
          <rect x={view.x} y={view.y} width={view.w} height={view.h} fill={`url(#${id}-fade)`} />
        </mask>
        <radialGradient id={`${id}-glow`} gradientUnits="userSpaceOnUse" cx={gx} cy={gy} r={gr}>
          <stop offset="0%" stopColor={C.bg2} stopOpacity={0.9} />
          <stop offset="100%" stopColor={C.bg0} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill={`url(#${id}-glow)`} />
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill={`url(#${id}-grid)`} mask={`url(#${id}-mask)`} />
    </g>
  );
});

export default Floor;
