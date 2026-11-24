// Step choreography (SPEC 3.0 item 3), derived from the diff of two consecutive scenes so lesson
// authors write nothing. Pure and unit tested. Played only when entering a step forward by
// exactly one, or on Replay; Back and jumps get the plain 3.4 tweens.
//
// Timeline, in order:
//  1. Slide (0 to ~350ms): pointer markers, moved blocks and Leet spring to their new spots
//     (Motion does this; the plan only waits for it when something moved).
//  2. Lookups: rings pulse on the slots a step checks, and a "miss" flashes a hash map when a
//     lookup finds nothing. Lookups come before stores, matching "check first, store second".
//  3. Flights: values being stored fly as glowing tokens along an arc into their new slot, which
//     drops in as the token lands.
//
// Rules:
//  - Pulse: a block that existed last step and whose tone changes to good, bad or compare pulses
//    in its new tone.
//  - Lookup pulse: a var with tone good, bad or active that is new or changed this step, whose
//    value equals the text of an existing hash map key block, pulses that block in the var's tone.
//  - Miss: such a var with tone bad that matches no hash map key flashes the first hash map in
//    the scene red (its title pill and a ring on its plate).
//  - Fly: a block whose key is new this step and whose text equals the text of an `active` or
//    `compare` block in another structure (or that block's index label, e.g. a hash map value
//    that stores an index) gets a token flying from that source. It stays hidden until the token
//    lands. Several flights stagger in draw order.
//  - Flows with `loop: false` fly one plain token in the flight phase.
import type { Scene, Tone } from '../content/schema';
import { project } from './iso';
import { blockTop, type Pt } from './metrics';
import type { CBlock, ComposedScene } from './types';

export const TIMING = {
  slide: 320,
  idleLead: 120, // lookups start this soon when nothing slides
  lookupGap: 300, // time given to lookups before flights start
  pulse: 620,
  miss: 620,
  fly: 420,
  flyStagger: 130,
  drop: 250,
} as const;

export interface Flight {
  key: string;
  /** Block key that appears when the token lands, if any. */
  target?: string;
  text: string;
  tone: Tone;
  from: Pt;
  to: Pt;
  start: number;
  dur: number;
}
export interface Pulse {
  key: string;
  target: string;
  tone: Tone;
  at: Pt;
  start: number;
  dur: number;
}
export interface Miss {
  key: string;
  sid: string;
  at: Pt;
  start: number;
  dur: number;
}
export interface ChoreoPlan {
  flights: Flight[];
  pulses: Pulse[];
  misses: Miss[];
  /** Block key -> ms after the step starts when it may drop in. Keys not listed appear at once. */
  appear: Record<string, number>;
  /** When everything has finished, ms. */
  total: number;
}

const PULSE_TONES: Tone[] = ['good', 'bad', 'compare'];
const LOOKUP_TONES: Tone[] = ['good', 'bad', 'active'];
const SOURCE_TONES: Tone[] = ['active', 'compare'];

const samePos = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  a.x === b.x && a.y === b.y && a.z === b.z;

export function planChoreo(prevScene: Scene | null, prev: ComposedScene | null, nextScene: Scene, next: ComposedScene): ChoreoPlan {
  const prevBlocks = new Map((prev?.blocks ?? []).map((b) => [b.key, b]));
  const prevMarkers = new Map((prev?.markers ?? []).map((m) => [m.key, m]));

  const moved =
    next.blocks.some((b) => prevBlocks.has(b.key) && !samePos(prevBlocks.get(b.key)!, b)) ||
    next.markers.some((m) => !prevMarkers.has(m.key) || !samePos(prevMarkers.get(m.key)!, m)) ||
    (!!prev?.leet && !!next.leet && (prev.leet.tx !== next.leet.tx || prev.leet.ty !== next.leet.ty));
  const lookupStart = moved ? TIMING.slide : TIMING.idleLead;

  // ---- lookups ----
  const pulses: Pulse[] = [];
  const pulsed = new Set<string>();
  const pulse = (b: CBlock, tone: Tone) => {
    if (pulsed.has(b.key)) return;
    pulsed.add(b.key);
    pulses.push({ key: `pulse:${b.key}`, target: b.key, tone, at: blockTop(b), start: lookupStart, dur: TIMING.pulse });
  };
  for (const b of next.blocks) {
    const p = prevBlocks.get(b.key);
    if (p && p.tone !== b.tone && PULSE_TONES.includes(b.tone)) pulse(b, b.tone);
  }
  // One ring per hash map entry: drop a value block's ring when its key block already pulses.
  for (let i = pulses.length - 1; i >= 0; i--) {
    const t = pulses[i].target;
    if (t.endsWith('#value') && pulsed.has(t.slice(0, -'#value'.length))) pulses.splice(i, 1);
  }

  const misses: Miss[] = [];
  const prevVars = new Map((prevScene?.vars ?? []).map((v) => [v.name, v]));
  const mapKeys = next.blocks.filter((b) => b.skind === 'hashmap' && b.role === 'key' && prevBlocks.has(b.key));
  const firstMap = next.structures.find((s) => s.kind === 'hashmap');
  for (const v of nextScene.vars ?? []) {
    if (!v.tone || !LOOKUP_TONES.includes(v.tone)) continue;
    const pv = prevVars.get(v.name);
    if (pv && pv.value === v.value && pv.tone === v.tone) continue;
    const hits = mapKeys.filter((b) => b.text === String(v.value));
    hits.forEach((b) => pulse(b, v.tone!));
    if (!hits.length && v.tone === 'bad' && firstMap && !misses.some((m) => m.sid === firstMap.id)) {
      const plate = next.zones.find((z) => z.sid === firstMap.id && z.style === 'plate');
      const at: Pt = plate ? project(plate.x + plate.w / 2, plate.y + plate.d / 2) : [firstMap.box.x + firstMap.box.w / 2, firstMap.box.y + firstMap.box.h / 2];
      misses.push({ key: `miss:${firstMap.id}`, sid: firstMap.id, at, start: lookupStart, dur: TIMING.miss });
    }
  }

  // ---- flights ----
  const flyStart = lookupStart + (pulses.length || misses.length ? TIMING.lookupGap : 0);
  const sources = next.blocks.filter((b) => SOURCE_TONES.includes(b.tone));
  const sourceKeys = new Set(sources.map((s) => s.key));
  const indexLabels = next.labels.filter((l) => l.kind === 'index' && l.for && sourceKeys.has(l.for));
  const flights: Flight[] = [];
  const appear: Record<string, number> = {};
  for (const b of next.blocks) {
    if (prevBlocks.has(b.key)) continue;
    let from: Pt | null = null;
    let tone: Tone = 'active';
    const src = sources.find((s) => s.sid !== b.sid && s.text === b.text);
    if (src) {
      from = blockTop(src);
      tone = src.tone;
    } else {
      const lab = indexLabels.find((l) => l.sid !== b.sid && l.text === b.text);
      if (lab) {
        from = project(lab.x, lab.y);
        tone = sources.find((s) => s.key === lab.for)?.tone ?? 'active';
      }
    }
    if (!from) continue;
    const start = flyStart + flights.length * TIMING.flyStagger;
    flights.push({ key: `fly:${b.key}`, target: b.key, text: b.text, tone, from, to: blockTop(b), start, dur: TIMING.fly });
    appear[b.key] = start + TIMING.fly - 60;
  }
  for (const f of next.flows) {
    if (f.loop) continue;
    const start = flyStart + flights.length * TIMING.flyStagger;
    flights.push({ key: `fly:${f.key}`, text: '', tone: f.tone, from: f.from, to: f.to, start, dur: TIMING.fly });
  }

  const ends = [
    lookupStart,
    ...pulses.map((p) => p.start + p.dur),
    ...misses.map((m) => m.start + m.dur),
    ...flights.map((f) => f.start + f.dur + (f.target ? TIMING.drop - 60 : 0)),
  ];
  return { flights, pulses, misses, appear, total: Math.max(...ends) };
}

/** Point along a flight's arc at progress u in [0, 1]. The arc peaks above the higher endpoint. */
export function arcPoint(from: Pt, to: Pt, u: number): Pt {
  const lift = 40 + Math.hypot(to[0] - from[0], to[1] - from[1]) * 0.25;
  const cx = (from[0] + to[0]) / 2;
  const cy = Math.min(from[1], to[1]) - lift;
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return [a * from[0] + b * cx + c * to[0], a * from[1] + b * cy + c * to[1]];
}

export const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
