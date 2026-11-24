// Tone colours for the scene (SPEC 3.3, values from tokens.css / SPEC 5.1). Kept as hex here, not
// CSS variables, because Motion can only crossfade concrete colours.
import type { Tone } from '../content/schema';

export const C = {
  bg0: '#070b1a',
  bg1: '#0b1228',
  bg2: '#121c3a',
  line: '#1e2c56',
  lineBright: '#33488a',
  text: '#e6f0ff',
  textDim: '#8fa3c8',
  cyan: '#22e0f0',
  cyanDeep: '#0e8fa3',
  magenta: '#ff4fd8',
  green: '#4dff9a',
  greenDeep: '#1f9a57',
  red: '#ff5470',
  redDeep: '#a32840',
  amber: '#ffd166',
  amberDeep: '#a8842c',
  violet: '#9b8cff',
  violetDeep: '#5546b8',
  ink: '#050814',
} as const;

export interface Faces {
  top: string;
  left: string;
  right: string;
  outline: string;
  text: string;
  /** 1px highlight along the back edges of the top face. */
  hi: string;
  /** Accent used for glows, rings, markers and HUD bars. */
  accent: string;
  opacity: number;
}

const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
/** Even mix of two hex colours (t = share of b). */
export function mix(a: string, b: string, t = 0.5): string {
  const [x, y] = [hex(a), hex(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Block rims: on a dark floor an ink outline vanishes, so every block gets a visible rim. Tone
// blocks use their deep colour pulled a little toward ink, idle blocks a brighter line colour.
function lit(top: string, deep: string): Omit<Faces, 'opacity'> {
  return { top, left: mix(top, deep), right: deep, outline: mix(deep, C.ink, 0.2), text: C.ink, hi: mix(top, '#ffffff', 0.6), accent: top };
}

// Idle faces, lifted above the floor (#070b1a) and plates (#0b1228) so idle blocks read as
// physical objects. A deliberate step up from the SPEC 3.3 table (bg-2 / #0e1630 / bg-1).
export const IDLE_FACE = { top: '#1c2a55', left: '#16224a', right: '#101a3b', rim: '#4a64b4' } as const;

const IDLE: Omit<Faces, 'opacity'> = {
  top: IDLE_FACE.top,
  left: IDLE_FACE.left,
  right: IDLE_FACE.right,
  outline: IDLE_FACE.rim,
  text: C.text,
  hi: mix(IDLE_FACE.rim, '#ffffff', 0.35),
  accent: C.lineBright,
};

/** Hash map value blocks are secondary: faces pulled toward the deep side, dim text when idle. */
export function valueFaces(f: Faces, tone: Tone): Faces {
  if (tone === 'idle' || tone === 'muted') return { ...f, top: mix(f.top, C.bg1, 0.35), left: mix(f.left, C.bg1, 0.3), text: C.textDim };
  return { ...f, top: mix(f.top, f.right, 0.3), left: mix(f.left, f.right, 0.3), hi: mix(f.hi, f.top, 0.5) };
}

const VISITED_TOP = mix(C.violet, IDLE_FACE.top, 0.45);
const VISITED: Faces = {
  top: VISITED_TOP,
  left: mix(VISITED_TOP, C.violetDeep, 0.55),
  right: mix(C.violetDeep, C.ink, 0.35),
  outline: mix(C.violetDeep, C.violet, 0.3),
  text: C.text,
  hi: mix(VISITED_TOP, '#ffffff', 0.35),
  accent: C.violet,
  opacity: 1,
};

export const FACES: Record<Tone, Faces> = {
  idle: { ...IDLE, opacity: 1 },
  active: { ...lit(C.cyan, C.cyanDeep), opacity: 1 },
  compare: { ...lit(C.amber, C.amberDeep), opacity: 1 },
  good: { ...lit(C.green, C.greenDeep), opacity: 1 },
  bad: { ...lit(C.red, C.redDeep), opacity: 1 },
  // Deviation from SPEC 3.3 ("Violet at 70% opacity"): translucent blocks let the floor and
  // neighbours show through in dense scenes, so visited is fully opaque in a dimmer violet instead.
  visited: VISITED,
  muted: { ...IDLE, opacity: 0.45 },
};

/**
 * Grid cells keep their height when muted (layout/common toneBlock), so a translucent block would
 * show the cells behind it through its faces. Muted grid cells are opaque and dimmed instead.
 */
export const MUTED_SOLID: Faces = {
  top: mix(IDLE_FACE.top, C.bg0, 0.5),
  left: mix(IDLE_FACE.left, C.bg0, 0.5),
  right: mix(IDLE_FACE.right, C.bg0, 0.5),
  outline: mix(IDLE_FACE.rim, C.bg0, 0.55),
  text: C.textDim,
  hi: mix(IDLE_FACE.rim, C.bg0, 0.4),
  accent: C.lineBright,
  opacity: 1,
};

/** Faces for a block: its tone's, except muted grid cells (opaque and dimmed). */
export const blockFaces = (tone: Tone, kind?: string): Faces => (tone === 'muted' && kind === 'grid' ? MUTED_SOLID : FACES[tone]);

/** Accent colour for a tone (markers, rings, HUD bars, tokens). Idle and muted use cyan for markers. */
export const accent = (tone: Tone | undefined): string => {
  if (!tone || tone === 'idle' || tone === 'muted') return C.lineBright;
  return FACES[tone].accent;
};

/** Legend wording (SPEC 3.0 item 7), in display order. */
export const TONE_LABELS: [Tone, string][] = [
  ['active', 'looking at'],
  ['compare', 'comparing'],
  ['good', 'match'],
  ['bad', 'no match'],
  ['visited', 'done'],
  ['muted', 'ruled out'],
];

/**
 * Index label colour under a block of a tone. Idle sits a step above dim text so it stays legible
 * on phones, visited is a violet clearly lighter than the visited block face, other tones use their
 * accent.
 */
export const INDEX_IDLE = mix(C.textDim, C.text, 0.3);
export const INDEX_VISITED = mix(C.violet, '#ffffff', 0.4);
export function indexColor(tone: Tone): string {
  if (tone === 'idle') return INDEX_IDLE;
  if (tone === 'muted') return C.textDim;
  if (tone === 'visited') return INDEX_VISITED;
  return FACES[tone].accent;
}
