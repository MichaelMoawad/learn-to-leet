import { describe, expect, it } from 'vitest';
import { LIFT, project, TH, TW, unproject, ZU } from '../../src/visual/iso';

describe('iso projection', () => {
  it('uses a 64 by 32 tile and 16px height units', () => {
    expect([TW, TH, ZU, LIFT]).toEqual([64, 32, 16, 0.5]);
  });

  it('projects the world axes onto 2:1 diagonals', () => {
    expect(project(0, 0)).toEqual([0, 0]);
    expect(project(1, 0)).toEqual([32, 16]); // x runs down and to the right
    expect(project(0, 1)).toEqual([-32, 16]); // y runs down and to the left
    expect(project(1, 1)).toEqual([0, 32]);
    expect(project(0, 0, 1)).toEqual([0, -16]); // z lifts straight up
    expect(project(2, 3, 2)).toEqual([-32, 48]);
  });

  it('unprojects a screen point back to the floor point under it', () => {
    for (const [x, y] of [[0, 0], [3, 1], [-2, 5], [0.5, 2.25], [7, -3]]) {
      const [sx, sy] = project(x, y);
      const [ux, uy] = unproject(sx, sy);
      expect(ux).toBeCloseTo(x, 10);
      expect(uy).toBeCloseTo(y, 10);
    }
  });

  it('unproject ignores height (it finds the floor)', () => {
    const [sx, sy] = project(2, 1, 0);
    expect(unproject(sx, sy)).toEqual([2, 1]);
  });
});
