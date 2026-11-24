// The visual engine (SPEC 3). Renders one step of a lesson as an isometric diorama that fills its
// container: a world-aligned floor grid edge to edge, chunky blocks, pills, Leet, HUD tiles, a
// legend and Replay / Pause. The view is fitted once to the lesson-wide bounds, so it never
// shifts between steps. Entering a step forward by one (or Replay) plays the choreography from
// choreo.ts; Back and jumps play the plain 3.4 tweens; reduced motion swaps instantly.
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Scene } from '../content/schema';
import { useReducedMotion } from '../app/useReducedMotion';
import { SceneLeet } from '../mascot/SceneLeet';
import { planChoreo, type ChoreoPlan } from './choreo';
import { composeLesson, depthCompare } from './compose';
import { leetPose } from './leet';
import { FlowTokens } from './render/Edge';
import { Edge } from './render/Edge';
import { Block, BlockShadow } from './render/Block';
import { FlightLayer, PulseLayer } from './render/Choreo';
import { Floor } from './render/Floor';
import { Label } from './render/Label';
import { Marker } from './render/Marker';
import { Zone } from './render/Zone';
import { NONE, SceneMotionContext, type SceneMotion } from './render/context';
import { Caption, Controls, Legend, legendItemWidth, tileSize, VarTile } from './hud/Hud';
import { blockTop, textBoost } from './metrics';
import { C, FACES, indexColor, TONE_LABELS } from './tones';
import type { CBlock, ComposedScene, Rect } from './types';
import './visual.css';

const EMPTY_SCENE: Scene = { structures: [] };
const EMPTY: ComposedScene = { blocks: [], edges: [], zones: [], markers: [], labels: [], flows: [], structures: [], leet: null, bounds: { x: 0, y: 0, w: 0, h: 0 } };
const MAX_SCALE = 1.5;

type Mode = 'rest' | 'play' | 'snap';
interface Run {
  shown: number; // scene index on screen, -1 = empty (Replay of the first step)
  from: number | null;
  mode: Mode;
  id: number;
}

/** Scene clock for the choreography: ms since the step started, frozen while paused. */
function useClock(plan: ChoreoPlan | null, runId: number, paused: boolean): number {
  const [clock, setClock] = useState({ id: runId, t: 0 });
  const ref = useRef({ id: runId, t: 0 });
  if (ref.current.id !== runId) ref.current = { id: runId, t: 0 };
  useEffect(() => {
    if (!plan || paused) return;
    const total = plan.total + 80;
    if (ref.current.t > total) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      ref.current.t += Math.min(64, now - last);
      last = now;
      setClock({ id: runId, t: ref.current.t });
      if (ref.current.t <= total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [plan, runId, paused]);
  return clock.id === runId ? clock.t : 0;
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export function Visual({ scenes, index }: { scenes: Scene[]; index: number }) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const lesson = useMemo(() => composeLesson(scenes), [scenes]);
  const clampIndex = Math.min(Math.max(index, 0), Math.max(scenes.length - 1, 0));

  // ---- step state machine ----
  const [run, setRun] = useState<Run>({ shown: clampIndex, from: null, mode: 'rest', id: 0 });
  const [paused, setPaused] = useState(false);
  if (run.mode !== 'snap' && run.shown !== clampIndex) {
    setRun({ shown: clampIndex, from: run.shown, mode: !reduced && clampIndex === run.shown + 1 ? 'play' : 'rest', id: run.id + 1 });
  }
  const indexRef = useRef(clampIndex);
  indexRef.current = clampIndex;
  useEffect(() => {
    if (run.mode !== 'snap') return;
    // Show the previous step for two frames with every duration at zero, then play into this one.
    let b = 0;
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setRun((r) => ({ shown: indexRef.current, from: r.shown, mode: 'play', id: r.id + 1 })));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [run.mode, run.id]);

  const replay = useCallback(() => {
    if (reduced) return;
    setPaused(false);
    setRun((r) => ({ shown: indexRef.current - 1, from: r.shown, mode: 'snap', id: r.id + 1 }));
  }, [reduced]);

  const sceneAt = (i: number | null) => (i === null || i < 0 ? EMPTY_SCENE : (scenes[i] ?? EMPTY_SCENE));
  const composedAt = (i: number | null) => (i === null || i < 0 ? EMPTY : (lesson.scenes[i] ?? EMPTY));
  const scene = sceneAt(run.shown);
  const composed = composedAt(run.shown);
  const prevComposed = run.from === null ? null : composedAt(run.from);

  const plan = useMemo(
    () => (run.mode === 'play' && !reduced ? planChoreo(run.from === null || run.from < 0 ? null : sceneAt(run.from), run.from === null || run.from < 0 ? null : composedAt(run.from), scene, composed) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run.id, reduced, lesson],
  );
  const t = useClock(plan, run.id, paused);
  const playing = !!plan && t <= plan.total;

  const instant = reduced || run.mode === 'snap';

  // New keys drop in staggered 30ms in draw order, the stagger capped at 300ms (SPEC 3.4).
  const enterDelay = useMemo(() => {
    const out = new Map<string, number>();
    if (!prevComposed || instant) return out;
    const old = new Set(prevComposed.blocks.map((b) => b.key));
    const fresh = composed.blocks.filter((b) => !old.has(b.key) && !(plan && b.key in plan.appear));
    const step = fresh.length > 1 ? Math.min(30, 300 / fresh.length) : 0;
    fresh.forEach((b, i) => out.set(b.key, i * step));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id, instant]);

  // Blocks waiting for their flying token stay hidden until it lands.
  const visible = (b: CBlock) => !plan || !playing || plan.appear[b.key] === undefined || t >= plan.appear[b.key];
  const blocks = composed.blocks.filter(visible);

  // Pulse ring colour on a block outline while it pulses; miss flash on hash map title pills.
  const flashing = new Map<string, string>();
  if (plan && playing) {
    for (const m of plan.misses) if (t >= m.start && t < m.start + m.dur) flashing.set(m.sid, C.red);
  }
  const hotIndex = new Map<string, string>();
  for (const b of composed.blocks) hotIndex.set(b.key, indexColor(b.tone));

  // ---- Leet ----
  const leet = composed.leet;
  const [walk, setWalk] = useState<{ walking: boolean; facing: 'left' | 'right'; dur: number }>({ walking: false, facing: 'left', dur: 0.5 });
  const lastLeet = useRef(leet);
  const from = lastLeet.current;
  const leetDist = leet && from ? Math.hypot(leet.sx - from.sx, leet.sy - from.sy) : 0;
  const walkDur = leetDist ? Math.min(0.9, Math.max(0.42, leetDist / 220)) : walk.dur;
  useEffect(() => {
    const p = lastLeet.current;
    lastLeet.current = leet;
    if (!leet) return;
    const anchor = composed.blocks.find((b) => b.key === leet.anchor);
    const faceAnchor: 'left' | 'right' = anchor && blockTop(anchor)[0] > leet.sx ? 'right' : 'left';
    if (!p || instant || (p.sx === leet.sx && p.sy === leet.sy)) {
      setWalk((w) => (w.walking || w.facing !== faceAnchor ? { walking: false, facing: faceAnchor, dur: w.dur } : w));
      return;
    }
    const dur = Math.min(0.9, Math.max(0.42, Math.hypot(leet.sx - p.sx, leet.sy - p.sy) / 220));
    setWalk({ walking: true, facing: leet.sx >= p.sx ? 'right' : 'left', dur });
    const id = window.setTimeout(() => setWalk({ walking: false, facing: faceAnchor, dur }), dur * 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leet?.sx, leet?.sy, run.id]);

  // ---- fitting the lesson bounds into the pane, around the HUD ----
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const size = useSize(rootRef);
  const cw = size.w || 800;
  const ch = size.h || 560;
  const narrow = cw < 560;
  const maxVars = useMemo(() => Math.max(0, ...scenes.map((s) => s.vars?.length ?? 0)), [scenes]);
  const hasCaption = useMemo(() => scenes.some((s) => s.caption), [scenes]);
  const legendTones = useMemo(() => TONE_LABELS.filter(([t]) => lesson.tones.includes(t)), [lesson.tones]);

  const tile = tileSize(narrow);
  const controlsW = reduced ? 0 : narrow ? 92 : 210;
  const perRow = Math.max(1, Math.floor((cw - 24 - controlsW) / (tile.w + 8)));
  const hudRows = maxVars ? Math.ceil(maxVars / perRow) : reduced ? 0 : 1;
  const top = (narrow ? 4 : 12) + hudRows * (tile.h + 8);
  let legendRows = 0;
  if (legendTones.length) {
    let x = 0;
    legendRows = 1;
    for (const [, label] of legendTones) {
      const w = legendItemWidth(label, narrow);
      if (x + w > cw - 24 && x > 0) {
        legendRows++;
        x = 0;
      }
      x += w;
    }
  }
  const bottom = (narrow ? 8 : 10) + legendRows * (narrow ? 16 : 20) + (hasCaption ? (narrow ? 30 : 36) : 0);
  const availH = Math.max(80, ch - top - bottom);
  const PAD = 8;
  const lb = lesson.bounds;
  const scale = Math.min(MAX_SCALE, (cw - PAD * 2) / Math.max(1, lb.w), (availH - PAD * 2) / Math.max(1, lb.h));
  const cx = lb.x + lb.w / 2;
  const cy = lb.y + lb.h / 2;
  const k = textBoost(scale);
  const motionCtx = useMemo<SceneMotion>(() => ({ instant, reduced, paused, k }), [instant, reduced, paused, k]);
  const view: Rect = { x: cx - cw / 2 / scale, y: cy - (top + availH / 2) / scale, w: cw / scale, h: ch / scale };

  // Pause SMIL flow tokens along with everything else.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (paused) svg.pauseAnimations?.();
    else svg.unpauseAnimations?.();
  }, [paused]);

  // Draw list for the block layer: blocks plus Leet, back to front.
  type Item = { kind: 'block'; b: CBlock } | { kind: 'leet' };
  const items: Item[] = blocks.map((b) => ({ kind: 'block', b }));
  if (leet) {
    const lk = { x: leet.tx, y: leet.ty, z: 0, key: '~leet' };
    const at = items.findIndex((it) => it.kind === 'block' && depthCompare(lk, it.b) < 0);
    items.splice(at < 0 ? items.length : at, 0, { kind: 'leet' });
  }
  const pose = walk.walking && !instant ? 'walk' : leetPose(scenes, run.shown);

  return (
    <SceneMotionContext.Provider value={motionCtx}>
      <div
        ref={rootRef}
        className="ltl-scene relative h-full w-full overflow-hidden bg-bg-0"
        data-testid="visual"
        data-paused={paused || undefined}
        data-playing={playing || undefined}
        data-flights={plan ? plan.flights.map((f) => f.target ?? f.key).join(' ') : undefined}
        data-step={run.shown + 1}
      >
        <svg
          ref={svgRef}
          data-testid="scene-svg"
          className="absolute inset-0 h-full w-full select-none"
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={scene.caption ?? 'Step visual'}
        >
          <defs>
            <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={3.5} />
            </filter>
          </defs>
          <Floor view={view} glow={lb} id={uid} />
          <g>
            <AnimatePresence initial={false}>
              {composed.zones.map((z) => (
                <Zone key={z.key} z={z} />
              ))}
            </AnimatePresence>
          </g>
          <g>
            <AnimatePresence initial={false}>
              {composed.edges.map((e) => (
                <Edge key={e.key} e={e} />
              ))}
            </AnimatePresence>
          </g>
          <g filter={`url(#${uid}-soft)`}>
            <AnimatePresence initial={false}>
              {blocks.map((b) => (
                <BlockShadow key={b.key} b={b} enterDelay={enterDelay.get(b.key)} />
              ))}
            </AnimatePresence>
          </g>
          <g>
            <AnimatePresence initial={false}>
              {items.map((it) =>
                it.kind === 'block' ? (
                  <Block key={it.b.key} b={it.b} enterDelay={enterDelay.get(it.b.key)} />
                ) : (
                  <motion.g
                    key="~leet"
                    data-leet={leet!.anchor}
                    initial={false}
                    animate={{ x: leet!.sx, y: leet!.sy }}
                    transition={instant ? NONE : { duration: walkDur || 0.5, ease: 'easeInOut' }}
                  >
                    <SceneLeet pose={pose} facing={walk.facing} animate={!reduced && !paused} scale={2} />
                  </motion.g>
                ),
              )}
            </AnimatePresence>
          </g>
          {!reduced && (
            <g>
              {composed.flows
                .filter((f) => f.loop)
                .map((f) => {
                  const mx = (f.from[0] + f.to[0]) / 2;
                  const my = Math.min(f.from[1], f.to[1]) - 30;
                  return <FlowTokens key={f.key} d={`M${f.from[0]} ${f.from[1]}Q${mx} ${my} ${f.to[0]} ${f.to[1]}`} color={FACES[f.tone === 'idle' ? 'active' : f.tone].accent} />;
                })}
            </g>
          )}
          {plan && playing && <PulseLayer plan={plan} t={t} />}
          <g>
            <AnimatePresence initial={false}>
              {composed.markers.map((m) => (
                <Marker key={m.key} m={m} />
              ))}
            </AnimatePresence>
          </g>
          <g>
            <AnimatePresence initial={false}>
              {composed.labels.map((l) => (
                <Label key={l.key} l={l} flash={l.kind === 'title' ? flashing.get(l.sid) : undefined} hot={l.kind === 'index' && l.for ? hotIndex.get(l.for) : undefined} />
              ))}
            </AnimatePresence>
          </g>
          {plan && playing && <FlightLayer plan={plan} t={t} />}
        </svg>

        <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 ${narrow ? 'p-1' : 'p-3'}`}>
          <div className="flex min-w-0 flex-wrap gap-2" data-testid="scene-vars">
            {(scene.vars ?? []).map((v) => (
              <VarTile key={v.name} v={v} narrow={narrow} reduced={reduced} />
            ))}
          </div>
          {!reduced && (
            <div className="pointer-events-auto shrink-0">
              <Controls paused={paused} narrow={narrow} onReplay={replay} onPause={() => setPaused((p) => !p)} />
            </div>
          )}
        </div>
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col ${narrow ? 'gap-1.5 px-1 pb-1.5' : 'gap-2 px-3 pb-2.5'}`}>
          {hasCaption && (
            <div className="flex items-end justify-center">
              <Caption text={scene.caption} />
            </div>
          )}
          <Legend tones={lesson.tones} narrow={narrow} />
        </div>
      </div>
    </SceneMotionContext.Provider>
  );
}

export default Visual;
