// Leet's pixel frames (SPEC 5.3). Each frame is 24 strings of 24 characters, one per pixel.
// '.' is transparent; every other character is a palette key. Drawn by ui/PixelSprite.
import type { PixelFrame, PixelPalette } from '../ui/PixelSprite';
import type { LeetPose } from '../content/schema';

/** Front view, used in the hero, the 404 page and speech bubbles. Six colours plus transparent. */
export const LEET_PALETTE: PixelPalette = {
  o: 'var(--ink)', // outline
  c: 'var(--cyan)', // body
  d: 'var(--cyan-deep)', // body shade
  s: 'var(--bg-1)', // screen
  f: 'var(--text)', // face pixels
  m: 'var(--magenta)', // antenna tip, cheeks, hint spark
};

/**
 * Two frames per pose, played at 3 fps (Leet.tsx). idle blinks, hint flickers its spark,
 * cheer hops 2px, oops drips a sweat drop.
 */
export const LEET_FRAMES: Record<LeetPose, readonly [PixelFrame, PixelFrame]> = {
  idle: [
    [
      '........................',
      '...........oo...........',
      '..........omfo..........',
      '..........ommo..........',
      '..........oddo..........',
      '.....oooooooooooooo.....',
      '....occcccccccccccco....',
      '....occsssssssssscdo....',
      '....occsffssssffscdo....',
      '....occsffssssffscdo....',
      '.oo.occmmssssssmmcdo.oo.',
      'occddccsssfssfssscdddcdo',
      'occddccssssffsssscdddcdo',
      'occooccsssssssssscdoocdo',
      'occoocccccccccccmcdoocdo',
      'oddooddddddddddddddooddo',
      '.oo..oooooddddooooo..oo.',
      '.......occcccccco.......',
      '.......occcccccdo.......',
      '.......oddddddddo.......',
      '.......ooddooddoo.......',
      '........oddooddo........',
      '......occdo..occdo......',
      '......ooooo..ooooo......',
    ],
    [
      '........................',
      '...........oo...........',
      '..........omfo..........',
      '..........ommo..........',
      '..........oddo..........',
      '.....oooooooooooooo.....',
      '....occcccccccccccco....',
      '....occsssssssssscdo....',
      '....occsssssssssscdo....',
      '....occsffssssffscdo....',
      '.oo.occmmssssssmmcdo.oo.',
      'occddccsssfssfssscdddcdo',
      'occddccssssffsssscdddcdo',
      'occooccsssssssssscdoocdo',
      'occoocccccccccccmcdoocdo',
      'oddooddddddddddddddooddo',
      '.oo..oooooddddooooo..oo.',
      '.......occcccccco.......',
      '.......occcccccdo.......',
      '.......oddddddddo.......',
      '.......ooddooddoo.......',
      '........oddooddo........',
      '......occdo..occdo......',
      '......ooooo..ooooo......',
    ],
  ],
  hint: [
    [
      '................m.......',
      '...........oo..mfm......',
      '..........omfo..m.....o.',
      '..........ommo.......oco',
      '..........oddo.......oco',
      '.....oooooooooooooo.occo',
      '....occccccccccccccoocco',
      '....occssffsssffscdoocco',
      '....occssffsssffscdoocdo',
      '....occsssssssssscdoocdo',
      '.oo.occmmssssssmmcdddcdo',
      'occddccssssfssfsscddddo.',
      'occddccsssssffssscdo.oo.',
      'occooccsssssssssscdo....',
      'occoocccccccccccmcdo....',
      'oddooddddddddddddddo....',
      '.oo..oooooddddooooo.....',
      '.......occcccccco.......',
      '.......occcccccdo.......',
      '.......oddddddddo.......',
      '.......ooddooddoo.......',
      '........oddooddo........',
      '......occdo..occdo......',
      '......ooooo..ooooo......',
    ],
    [
      '...............m.m......',
      '...........oo...f.......',
      '..........omfo.m.m....o.',
      '..........ommo.......oco',
      '..........oddo.......oco',
      '.....oooooooooooooo.occo',
      '....occccccccccccccoocco',
      '....occssffsssffscdoocco',
      '....occssffsssffscdoocdo',
      '....occsssssssssscdoocdo',
      '.oo.occmmssssssmmcdddcdo',
      'occddccssssfssfsscddddo.',
      'occddccsssssffssscdo.oo.',
      'occooccsssssssssscdo....',
      'occoocccccccccccmcdo....',
      'oddooddddddddddddddo....',
      '.oo..oooooddddooooo.....',
      '.......occcccccco.......',
      '.......occcccccdo.......',
      '.......oddddddddo.......',
      '.......ooddooddoo.......',
      '........oddooddo........',
      '......occdo..occdo......',
      '......ooooo..ooooo......',
    ],
  ],
  cheer: [
    [
      '........................',
      '...........oo...........',
      '..........omfo..........',
      '..........ommo..........',
      '..........oddo..........',
      '.oo..oooooooooooooo..oo.',
      'occooccccccccccccccoocco',
      'occooccsssssssssscdoocco',
      'occooccssfssssfsscdoocdo',
      'occooccsfsfssfsfscdoocdo',
      'ocdddccmmssssssmmcdddcdo',
      'oddddccsssffffssscddddo.',
      '.oo.occsssfmmfssscdo.oo.',
      '....occssssffsssscdo....',
      '....occcccccccccmcdo....',
      '....oddddddddddddddo....',
      '.....oooooddddooooo.....',
      '.......occcccccco.......',
      '.......occcccccdo.......',
      '.......oddddddddo.......',
      '.......ooddooddoo.......',
      '........oddooddo........',
      '......occdo..occdo......',
      '......ooooo..ooooo......',
    ],
    [
      '..........omfo..........',
      '..........ommo..........',
      '..........oddo..........',
      '.oo..oooooooooooooo..oo.',
      'occooccccccccccccccoocco',
      'occooccsssssssssscdoocco',
      'occooccssfssssfsscdoocdo',
      'occooccsfsfssfsfscdoocdo',
      'ocdddccmmssssssmmcdddcdo',
      'oddddccsssffffssscddddo.',
      '.oo.occsssfmmfssscdo.oo.',
      '....occssssffsssscdo....',
      '....occcccccccccmcdo....',
      '....oddddddddddddddo....',
      '.....oooooddddooooo.....',
      '.......occcccccco.......',
      '.......occcccccdo.......',
      '.......oddddddddo.......',
      '.......ooddooddoo.......',
      '........oddooddo........',
      '......occdo..occdo......',
      '......ooooo..ooooo......',
      '........................',
      '........................',
    ],
  ],
  oops: [
    [
      '........................',
      '...........oo.........o.',
      '..........omfo.......oco',
      '..........ommo......ofco',
      '..........oddo......occo',
      '.....oooooooooooooo..oo.',
      '....occcccccccccccco....',
      '....occsssssssssscdo....',
      '....occsfsfssfsfscdo....',
      '....occssfssssfsscdo....',
      '.oo.occsfsfssfsfscdo.oo.',
      'occddccsssssssssscdddcdo',
      'occddccssssfsfssscdddcdo',
      'occooccsssfsfsfsscdoocdo',
      'occoocccccccccccmcdoocdo',
      'oddooddddddddddddddooddo',
      '.oo..oooooddddooooo..oo.',
      '.......occcccccco.......',
      '.......occcccccdo.......',
      '.......oddddddddo.......',
      '.......ooddooddoo.......',
      '........oddooddo........',
      '......occdo..occdo......',
      '......ooooo..ooooo......',
    ],
    [
      '........................',
      '...........oo...........',
      '..........omfo........o.',
      '..........ommo.......oco',
      '..........oddo......ofco',
      '.....oooooooooooooo.occo',
      '....occcccccccccccco.oo.',
      '....occsssssssssscdo....',
      '....occsfsfssfsfscdo....',
      '....occssfssssfsscdo....',
      '.oo.occsfsfssfsfscdo.oo.',
      'occddccsssssssssscdddcdo',
      'occddccssssfsfssscdddcdo',
      'occooccsssfsfsfsscdoocdo',
      'occoocccccccccccmcdoocdo',
      'oddooddddddddddddddooddo',
      '.oo..oooooddddooooo..oo.',
      '.......occcccccco.......',
      '.......occcccccdo.......',
      '.......oddddddddo.......',
      '.......ooddooddoo.......',
      '........oddooddo........',
      '......occdo..occdo......',
      '......ooooo..ooooo......',
    ],
  ],
};

export type SceneLeetPose = 'idle' | 'walk' | 'cheer' | 'hint' | 'oops';

/** Walk cycle for the scene: feet alternate and the body bobs up 1px on the first frame. */
const WALK: readonly [PixelFrame, PixelFrame] = [
  [
    '...........oo...........',
    '..........omfo..........',
    '..........ommo..........',
    '..........oddo..........',
    '.....oooooooooooooo.....',
    '....occcccccccccccco....',
    '....occsssssssssscdo....',
    '....occsffssssffscdo....',
    '....occsffssssffscdo....',
    '.oo.occmmssssssmmcdo.oo.',
    'occddccsssfssfssscdddcdo',
    'occddccssssffsssscdddcdo',
    'occooccsssssssssscdoocdo',
    'occoocccccccccccmcdoocdo',
    'oddooddddddddddddddooddo',
    '.oo..oooooddddooooo..oo.',
    '.......occcccccco.......',
    '.......occcccccdo.......',
    '.......oddddddddo.......',
    '.......ooddooddoo.......',
    '........oddooddo........',
    '......occdo.oddo........',
    '......ooooo..occdo......',
    '.............ooooo......',
  ],
  [
    '........................',
    '...........oo...........',
    '..........omfo..........',
    '..........ommo..........',
    '..........oddo..........',
    '.....oooooooooooooo.....',
    '....occcccccccccccco....',
    '....occsssssssssscdo....',
    '....occsffssssffscdo....',
    '....occsffssssffscdo....',
    '.oo.occmmssssssmmcdo.oo.',
    'occddccsssfssfssscdddcdo',
    'occddccssssffsssscdddcdo',
    'occooccsssssssssscdoocdo',
    'occoocccccccccccmcdoocdo',
    'oddooddddddddddddddooddo',
    '.oo..oooooddddooooo..oo.',
    '.......occcccccco.......',
    '.......occcccccdo.......',
    '.......oddddddddo.......',
    '.......ooddooddoo.......',
    '........oddo.occdo......',
    '......occdo..ooooo......',
    '......ooooo.............',
  ],
];

// ---------------------------------------------------------------------------------------------
// Scene Leet (SPEC 3.0 item 6) is an upright billboard of the front view, like pointers and labels
// (SPEC 3.1 rule 1), given depth the way the scene blocks are shaded: a lit 1px top edge and a 2px
// extrusion on the right in cyan-deep, the blocks' dark right face. Only the body (everything
// connected to the feet) is extruded, so the hint spark and sweat drop float free.

/** Scene palette: the front palette plus the top-edge highlight 'h' (the blocks' top-face highlight). */
export const SCENE_LEET_PALETTE: PixelPalette = {
  ...LEET_PALETTE,
  h: 'color-mix(in srgb, var(--cyan) 45%, white)',
};

export const EXTRUDE = 2;

/** Mirror a frame left to right. */
export function mirrorFrame(frame: PixelFrame): PixelFrame {
  return frame.map((r) => [...r].reverse().join(''));
}

/** Adds the lit top edge and the right-hand extrusion. Output is EXTRUDE columns wider. */
export function extrudeFrame(frame: PixelFrame): PixelFrame {
  const h = frame.length;
  const w = frame[0].length;
  const at = (x: number, y: number) => (y >= 0 && y < h && x >= 0 && x < w ? frame[y][x] : '.');
  // body = pixels 4-connected to the bottom row
  const body = new Set<number>();
  const stack: [number, number][] = [];
  for (let x = 0; x < w; x++) if (at(x, h - 1) !== '.') stack.push([x, h - 1]);
  if (!stack.length) for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0 && !stack.length; y--) if (at(x, y) !== '.') stack.push([x, y]);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const k = y * w + x;
    if (body.has(k) || at(x, y) === '.') continue;
    body.add(k);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  const out = frame.map((r) => [...r, ...'.'.repeat(EXTRUDE)]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!body.has(y * w + x)) continue;
      // the side face fills the gap behind the right-hand outline, so it joins the front face
      if (frame[y][x] === 'o' && at(x + 1, y) === '.' && at(x - 1, y) !== '.') out[y][x] = 'd';
      for (let e = 1; e <= EXTRUDE; e++) if (out[y][x + e] === '.') out[y][x + e] = 'd';
      const up = at(x, y - 1);
      if (frame[y][x] === 'c' && (up === '.' || up === 'o')) out[y][x] = 'h';
    }
  }
  return out.map((r) => r.join(''));
}

/** Front-view source frames for each scene pose, before extrusion. */
export const SCENE_LEET_SOURCE: Record<SceneLeetPose, readonly [PixelFrame, PixelFrame]> = {
  idle: LEET_FRAMES.idle,
  walk: WALK,
  cheer: LEET_FRAMES.cheer,
  hint: LEET_FRAMES.hint,
  oops: LEET_FRAMES.oops,
};

const build = (flip: boolean) =>
  Object.fromEntries(
    Object.entries(SCENE_LEET_SOURCE).map(([k, fs]) => [k, fs.map((f) => extrudeFrame(flip ? mirrorFrame(f) : f))]),
  ) as unknown as Record<SceneLeetPose, readonly [PixelFrame, PixelFrame]>;

/** Ready-to-draw scene frames, 26 by 24, facing right and (mirrored, still lit from the left) left. */
export const SCENE_LEET_FRAMES = build(false);
export const SCENE_LEET_FRAMES_LEFT = build(true);

/** Grid point on the floor under the centre of Leet's feet (bottom edge of the feet row). */
export const SCENE_LEET_ANCHOR = { x: 12, y: 24 } as const;

/** Soft floor shadow, a stepped 2:1 diamond centred on the anchor. Drawn in ink at 40%. */
export const SCENE_LEET_SHADOW: PixelFrame = [
  '......####......',
  '....########....',
  '..############..',
  '################',
  '################',
  '..############..',
  '....########....',
  '......####......',
];
