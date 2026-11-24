// Floor rectangle. `plate`: a platform under a structure with a short lip below the floor line.
// `outline`: a dashed bracket in its tone (sliding windows).
import { motion } from 'motion/react';
import { zoneCorners } from '../metrics';
import { C, FACES } from '../tones';
import type { CZone } from '../types';
import { COLOR, NONE, PATH, tr, useSceneMotion } from './context';

const LIP = 6;

export function Zone({ z }: { z: CZone }) {
  const { instant } = useSceneMotion();
  const [a, b, c, d] = zoneCorners(z);
  const poly = `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c[0]} ${c[1]}L${d[0]} ${d[1]}Z`;
  const move = tr(instant, PATH);
  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: instant ? NONE : { duration: 0.15 } },
    transition: { opacity: tr(instant, { duration: 0.25 }) },
  };

  if (z.style === 'plate') {
    // Front faces of the lip: from the right corner (b) down to the front corner (c), and c to d.
    const lipR = `M${b[0]} ${b[1]}L${c[0]} ${c[1]}L${c[0]} ${c[1] + LIP}L${b[0]} ${b[1] + LIP}Z`;
    const lipL = `M${c[0]} ${c[1]}L${d[0]} ${d[1]}L${d[0]} ${d[1] + LIP}L${c[0]} ${c[1] + LIP}Z`;
    const outline = `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${b[0]} ${b[1] + LIP}L${c[0]} ${c[1] + LIP}L${d[0]} ${d[1] + LIP}L${d[0]} ${d[1]}Z`;
    return (
      <motion.g data-zone={z.key} {...fade}>
        <motion.path initial={false} animate={{ d: lipR }} transition={move} fill="#080d20" />
        <motion.path initial={false} animate={{ d: lipL }} transition={move} fill="#0a1026" />
        <motion.path initial={false} animate={{ d: poly }} transition={move} fill={C.bg1} opacity={0.92} />
        <motion.path initial={false} animate={{ d: outline }} transition={move} fill="none" stroke={C.line} strokeWidth={2} strokeLinejoin="round" />
        <motion.path initial={false} animate={{ d: `M${d[0]} ${d[1]}L${a[0]} ${a[1]}L${b[0]} ${b[1]}` }} transition={move} fill="none" stroke={C.lineBright} strokeWidth={1} opacity={0.6} />
      </motion.g>
    );
  }

  const idle = z.tone === 'idle' || z.tone === 'muted';
  const color = idle ? C.lineBright : FACES[z.tone].accent;
  return (
    <motion.g data-zone={z.key} {...fade} opacity={idle ? 0.85 : 1}>
      <motion.path
        initial={false}
        animate={{ d: poly, stroke: color, fill: color }}
        transition={{ d: move, stroke: tr(instant, COLOR), fill: tr(instant, COLOR) }}
        fillOpacity={idle ? 0.04 : 0.08}
        strokeDasharray={idle ? '3 4' : '6 4'}
        strokeWidth={idle ? 1.5 : 2}
        strokeLinejoin="round"
      />
    </motion.g>
  );
}

export default Zone;
