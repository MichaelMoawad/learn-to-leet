// Upright text on the floor (SPEC 3.1 rule 1). Titles are rounded pills floating above (or below)
// their object with a thin leader line down to an anchor dot (SPEC 3.0 item 5). Index labels and
// notes are small floor text.
import { motion } from 'motion/react';
import { project } from '../iso';
import { INDEX_FONT, NOTE_FONT, PILL_FONT, PILL_H, pillWidth, titleBox } from '../metrics';
import { C, INDEX_IDLE } from '../tones';
import type { CLabel } from '../types';
import { COLOR, NONE, SPRING, tr, useSceneMotion } from './context';

export function Label({ l, flash, hot }: { l: CLabel; flash?: string; hot?: string }) {
  const { instant, k } = useSceneMotion();
  const [x, y] = project(l.x, l.y);
  const move = tr(instant, SPRING);
  const common = {
    initial: { x, y: y - 8, opacity: 0 },
    animate: { x, y, opacity: 1 },
    exit: { opacity: 0, transition: instant ? NONE : { duration: 0.15 } },
    transition: { x: move, y: move, opacity: tr(instant, { duration: 0.2 }) },
  };

  if (l.kind === 'title') {
    const { anchor, box } = titleBox(l, k);
    const bx = box.x - anchor[0];
    const by = box.y - anchor[1];
    const below = l.place === 'below';
    const stroke = flash ?? C.lineBright;
    return (
      <motion.g data-label={l.key} {...common}>
        <line x1={0} y1={0} x2={0} y2={below ? by : by + PILL_H} stroke={C.lineBright} strokeWidth={1.5} strokeDasharray="1 2" />
        <rect x={-2.5} y={-2.5} width={5} height={5} fill={C.lineBright} shapeRendering="crispEdges" />
        <motion.rect
          x={bx}
          y={by}
          width={box.w}
          height={PILL_H}
          rx={PILL_H / 2}
          initial={false}
          animate={{ stroke, fill: flash ? '#2a0f1c' : C.bg1 }}
          transition={tr(instant, COLOR)}
          strokeWidth={2}
        />
        <text
          x={bx + box.w / 2}
          y={by + PILL_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-mono)"
          fontWeight={700}
          fontSize={PILL_FONT * k}
          fill={flash ?? C.text}
        >
          {l.text}
        </text>
      </motion.g>
    );
  }

  if (l.kind === 'tag') {
    const w = pillWidth(l.text, k);
    return (
      <motion.g data-label={l.key} {...common}>
        <rect x={-w / 2} y={-PILL_H / 2} width={w} height={PILL_H} rx={PILL_H / 2} fill={C.bg1} stroke={C.lineBright} strokeWidth={2} />
        <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono)" fontWeight={700} fontSize={PILL_FONT * k} fill={C.text}>
          {l.text}
        </text>
      </motion.g>
    );
  }

  const isIndex = l.kind === 'index';
  return (
    <motion.g data-label={l.key} {...common}>
      <motion.text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={isIndex ? 'var(--font-label)' : 'var(--font-mono)'}
        fontSize={(isIndex ? INDEX_FONT : NOTE_FONT) * k}
        letterSpacing={isIndex ? '0.06em' : undefined}
        initial={false}
        animate={{ fill: hot ?? (isIndex ? INDEX_IDLE : C.textDim) }}
        transition={tr(instant, COLOR)}
      >
        {l.text}
      </motion.text>
    </motion.g>
  );
}

export default Label;
