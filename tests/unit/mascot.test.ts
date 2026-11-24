import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  LEET_FRAMES,
  LEET_PALETTE,
  SCENE_LEET_ANCHOR,
  SCENE_LEET_FRAMES,
  SCENE_LEET_FRAMES_LEFT,
  SCENE_LEET_PALETTE,
  extrudeFrame,
  SCENE_LEET_SHADOW,
} from '../../src/mascot/sprites';
import { frameSequence } from '../../src/mascot/SteppedFrames';
import { ICON_NAMES, icons } from '../../src/ui/icons';
import { PixelPaths, runPath } from '../../src/ui/PixelSprite';

function expectFrame(frame: readonly string[], size: number, allowed: string, width = size) {
  expect(frame).toHaveLength(size);
  for (const row of frame) {
    expect(row).toHaveLength(width);
    expect(row).toMatch(new RegExp(`^[${allowed.replace(/[\]\\^-]/g, '\\$&')}]+$`));
  }
}

describe('Leet front sprites', () => {
  const allowed = '.' + Object.keys(LEET_PALETTE).join('');
  it('uses the six-colour palette from SPEC 5.3', () => {
    expect(Object.keys(LEET_PALETTE).sort()).toEqual(['c', 'd', 'f', 'm', 'o', 's']);
  });
  for (const [pose, frames] of Object.entries(LEET_FRAMES)) {
    it(`${pose}: two 24x24 frames using only palette characters`, () => {
      expect(frames).toHaveLength(2);
      for (const f of frames) expectFrame(f, 24, allowed);
      expect(frames[0].join('')).not.toEqual(frames[1].join(''));
    });
  }
  it('cheer hops 2px on its second frame', () => {
    const [a, b] = LEET_FRAMES.cheer;
    expect(b.slice(0, 22)).toEqual(a.slice(2));
  });
});

describe('Leet scene sprites', () => {
  const allowed = '.' + Object.keys(SCENE_LEET_PALETTE).join('');
  for (const set of [SCENE_LEET_FRAMES, SCENE_LEET_FRAMES_LEFT]) {
    for (const [pose, frames] of Object.entries(set)) {
      it(`${pose}: two 24-row frames, 26 wide with the extrusion, palette characters only`, () => {
        expect(frames).toHaveLength(2);
        for (const f of frames) expectFrame(f, 24, allowed, 26);
      });
    }
  }
  it('stands on its anchor: feet on the bottom row, cheer hops 2px', () => {
    const lowest = (f: readonly string[]) => Math.max(...f.map((r, y) => (/[^.]/.test(r) ? y : -1)));
    for (const [pose, [a, b]] of Object.entries(SCENE_LEET_FRAMES)) {
      expect(lowest(a)).toBe(SCENE_LEET_ANCHOR.y - 1);
      expect(lowest(b)).toBe(SCENE_LEET_ANCHOR.y - 1 - (pose === 'cheer' ? 2 : 0));
    }
  });
  it('extrudes only the body, 2px to the right in cyan-deep, and lights top edges', () => {
    const out = extrudeFrame(['.....', '.m...', '.....', '.occ.', '.occ.']);
    expect(out).toEqual(['.......', '.m.....', '.......', '.ohhdd.', '.occdd.']);
  });
  it('has a 2:1 floor shadow', () => {
    expect(SCENE_LEET_SHADOW[0].length).toBe(SCENE_LEET_SHADOW.length * 2);
    for (const row of SCENE_LEET_SHADOW) expect(row).toMatch(/^[.#]+$/);
  });
  it('idle holds then blinks; other poses alternate', () => {
    expect(frameSequence('idle').filter((f) => f === 1)).toHaveLength(1);
    expect(frameSequence('walk')).toEqual([0, 1]);
  });
});

describe('icons', () => {
  for (const name of ICON_NAMES) {
    it(`${name} is a 16x16 drawing`, () => {
      expectFrame(icons[name], 16, '.#+');
      expect(icons[name].join('')).toMatch(/#/);
    });
  }
});

describe('PixelPaths', () => {
  const frame = ['aa.b', '.aaa', 'b...'];
  it('merges horizontal runs into one path per colour', () => {
    expect(runPath(frame, 'a')).toBe('M0 0h2v1h-2zM1 1h3v1h-3z');
    expect(runPath(frame, 'b')).toBe('M3 0h1v1h-1zM0 2h1v1h-1z');
  });
  it('renders one crisp <path> per palette colour, skipping colours not in the frame', () => {
    const html = renderToStaticMarkup(
      createElement('svg', null, createElement(PixelPaths, { frame, palette: { a: 'red', b: 'blue', z: 'green' }, x: 4, y: 2, scale: 2 })),
    );
    expect(html.match(/<path/g)).toHaveLength(2);
    expect(html).toContain('shape-rendering="crispEdges"');
    expect(html).toContain('transform="translate(4 2) scale(2)"');
    expect(html).toContain('d="M0 0h2v1h-2zM1 1h3v1h-3z"');
    expect(html).not.toContain('green');
  });
});
