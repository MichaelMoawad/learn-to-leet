// Pointer marker: a pill with the pointer's name over a pixel down arrow, floating above its
// target. Upright billboard (SPEC 3.1 rule 1). Bobs gently while idle.
import { motion } from 'motion/react';
import { MARKER_ARROW, MARKER_PILL_H, markerTip, markerWidth, PILL_FONT } from '../metrics';
import { C, FACES } from '../tones';
import type { CMarker } from '../types';
import { NONE, SPRING, tr, useSceneMotion } from './context';

export function Marker({ m }: { m: CMarker }) {
  const { instant, reduced, k } = useSceneMotion();
  const [x, y] = markerTip(m);
  const fill = m.tone === 'idle' || m.tone === 'muted' ? C.cyan : FACES[m.tone].accent;
  const w = markerWidth(m.text, k);
  const top = -MARKER_ARROW - MARKER_PILL_H;
  return (
    <motion.g
      data-marker={m.key}
      initial={{ x, y: y - 12, opacity: 0 }}
      animate={{ x, y, opacity: 1 }}
      exit={{ opacity: 0, transition: instant ? NONE : { duration: 0.15 } }}
      transition={{ x: tr(instant, SPRING), y: tr(instant, SPRING), opacity: tr(instant, { duration: 0.2 }) }}
    >
      <g className={reduced ? undefined : 'ltl-bob ltl-anim'} style={{ animationDelay: '-0.6s' }}>
        <path
          d={`M-6 ${-MARKER_ARROW}H6V${-MARKER_ARROW + 4}H4V${-MARKER_ARROW + 7}H2V${-MARKER_ARROW + 10}H-2V${-MARKER_ARROW + 7}H-4V${-MARKER_ARROW + 4}H-6Z`}
          fill={fill}
          stroke={C.ink}
          strokeWidth={1.5}
          shapeRendering="crispEdges"
        />
        <rect x={-w / 2} y={top - 1} width={w} height={MARKER_PILL_H} rx={MARKER_PILL_H / 2} fill={fill} stroke={C.ink} strokeWidth={2} />
        <text
          x={0}
          y={top - 1 + MARKER_PILL_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-mono)"
          fontWeight={700}
          fontSize={PILL_FONT * k}
          fill={C.ink}
        >
          {m.text}
        </text>
      </g>
    </motion.g>
  );
}

export default Marker;
