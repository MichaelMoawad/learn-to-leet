// A block (SPEC 3.1, 3.3, 3.0 item 2): a chunky slab with a lit top face, a 1px highlight along
// its back edges, a mid left face, a deep right face and a thick outline. Its value is upright
// text on the top face (shifted by `textDx`) or, for stack items, centred on the right face. Its soft floor shadow is
// drawn separately (BlockShadow) so every shadow sits under every block.
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { project, ZU } from '../iso';
import { INSET_X, INSET_Y, valueFont } from '../metrics';
import { blockFaces, mix, valueFaces } from '../tones';
import type { CBlock } from '../types';
import { COLOR, HEIGHT, NONE, SPRING, tr, useSceneMotion } from './context';

const HW = 32 - INSET_X;
const T = [0, INSET_Y];
const R = [HW, 16];
const B = [0, 32 - INSET_Y];
const L = [-HW, 16];
const pt = (p: number[], up: number) => `${p[0]} ${p[1] - up}`;

/** Face paths for a block `h` units tall, relative to its floor tile's top vertex. */
export function facePaths(h: number) {
  const u = h * ZU;
  return {
    top: `M${pt(T, u)}L${pt(R, u)}L${pt(B, u)}L${pt(L, u)}Z`,
    left: `M${pt(L, u)}L${pt(B, u)}L${pt(B, 0)}L${pt(L, 0)}Z`,
    right: `M${pt(B, u)}L${pt(R, u)}L${pt(R, 0)}L${pt(B, 0)}Z`,
    outline: `M${pt(T, u)}L${pt(R, u)}L${pt(R, 0)}L${pt(B, 0)}L${pt(L, 0)}L${pt(L, u)}Z`,
    inner: `M${pt(L, u)}L${pt(B, u)}L${pt(R, u)}M${pt(B, u)}L${pt(B, 0)}`,
    hi: `M${L[0] + 4} ${L[1] + 0.5 - u}L${T[0]} ${T[1] + 2 - u}L${R[0] - 4} ${R[1] + 0.5 - u}`,
  };
}

export function Block({ b, enterDelay = 0, ring }: { b: CBlock; enterDelay?: number; ring?: string }) {
  const { instant, reduced, k } = useSceneMotion();
  const [ox, oy] = project(b.x, b.y);
  const isValue = b.role === 'value';
  const f = isValue ? valueFaces(blockFaces(b.tone), b.tone) : blockFaces(b.tone, b.skind);
  const p = facePaths(b.h);
  const u = b.h * ZU;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const prevText = useRef(b.text);
  const pop = prevText.current !== b.text && !instant;
  prevText.current = b.text;
  // Where the value was last drawn, so a popped (remounted) value starts there and still tweens.
  const dx = b.textDx ?? 0;
  const prevPos = useRef({ x: dx, y: 16 - u });
  const from = prevPos.current;
  prevPos.current = { x: dx, y: 16 - u };

  const move = tr(instant, SPRING);
  const color = tr(instant, COLOR);
  const height = tr(instant, HEIGHT);
  const delay = mounted.current || instant ? 0 : enterDelay / 1000;
  const glow = b.tone === 'active' && !reduced;
  const outlineColor = ring ?? f.outline;

  return (
    <motion.g
      data-block={b.key}
      data-tone={b.tone}
      initial={{ x: ox, y: oy - 16, opacity: 0 }}
      animate={{ x: ox, y: oy, opacity: f.opacity }}
      exit={{ y: oy + 8, opacity: 0, transition: instant ? NONE : { duration: 0.15 } }}
      transition={{ x: move, y: { ...move, delay }, opacity: instant ? NONE : { duration: 0.25, delay } }}
    >
      <motion.g initial={false} animate={{ y: -b.z * ZU }} transition={move}>
        <g className={glow ? 'ltl-bob ltl-anim' : undefined} style={glow ? { filter: `drop-shadow(0 0 6px ${f.accent}66)` } : undefined}>
          {b.h > 0 && (
            <>
              <motion.path initial={false} animate={{ d: p.left, fill: f.left }} transition={{ d: height, fill: color }} shapeRendering="crispEdges" />
              <motion.path initial={false} animate={{ d: p.right, fill: f.right }} transition={{ d: height, fill: color }} shapeRendering="crispEdges" />
            </>
          )}
          <motion.path initial={false} animate={{ d: p.top, fill: f.top }} transition={{ d: height, fill: color }} shapeRendering="crispEdges" />
          <motion.path initial={false} animate={{ d: p.inner, stroke: mix(f.outline, f.right, 0.4) }} transition={{ d: height, stroke: color }} fill="none" strokeWidth={1} />
          <motion.path initial={false} animate={{ d: p.outline, stroke: outlineColor }} transition={{ d: height, stroke: color }} fill="none" strokeWidth={2} strokeLinejoin="round" />
          <motion.path initial={false} animate={{ d: p.hi, stroke: f.hi }} transition={{ d: height, stroke: color }} fill="none" strokeWidth={1} shapeRendering="crispEdges" />
          {b.textOn === 'top' ? (
            <motion.text
              key={pop ? `${b.text}-pop` : b.text}
              initial={pop ? { scale: 1, x: from.x, y: from.y } : false}
              animate={{ x: dx, y: 16 - u, scale: pop ? [1, 1.15, 1] : 1, fill: f.text }}
              transition={{ x: height, y: height, scale: { duration: 0.18 }, fill: color }}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
              fontWeight={700}
              fontSize={(isValue ? valueFont(b.text) - 2 : valueFont(b.text)) * k}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              {b.text}
            </motion.text>
          ) : (
            // Side text (stack items): upright, centred on the right face, same font as top values.
            <motion.text
              initial={false}
              animate={{ y: (B[1] + R[1]) / 2 - u / 2, fill: f.text }}
              transition={{ y: height, fill: color }}
              x={HW / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
              fontWeight={700}
              fontSize={valueFont(b.text) * k}
            >
              {b.text}
            </motion.text>
          )}
        </g>
      </motion.g>
    </motion.g>
  );
}

/** Soft blurred floor shadow under a block. Stays on the floor when the block floats. */
export function BlockShadow({ b, enterDelay = 0 }: { b: CBlock; enterDelay?: number }) {
  const { instant } = useSceneMotion();
  const [ox, oy] = project(b.x, b.y);
  const move = tr(instant, SPRING);
  const lifted = b.z > 0.01 && b.skind !== 'stack';
  return (
    <motion.g
      initial={{ x: ox, y: oy, opacity: 0 }}
      animate={{ x: ox, y: oy, opacity: blockFaces(b.tone, b.skind).opacity * (lifted ? 0.6 : 1) }}
      exit={{ opacity: 0, transition: instant ? NONE : { duration: 0.15 } }}
      transition={{ x: move, y: move, opacity: instant ? NONE : { duration: 0.25, delay: enterDelay / 1000 } }}
    >
      <path d={`M${3} ${INSET_Y + 4}L${HW + 7} ${18}L${3} ${36 - INSET_Y}L${-HW + 1} ${18}Z`} fill="#000" opacity={0.55} />
    </motion.g>
  );
}

export default Block;
