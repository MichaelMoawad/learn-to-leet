// Leet standing IN the visual scene (SPEC 3.0 item 6). An upright billboard of the front view
// (like pointers and labels, SPEC 3.1 rule 1), shaded like the blocks, over a stepped 2:1 floor
// shadow. Renders an SVG <g> (not an <svg>) so the engine can place it inside the scene SVG.
// Origin (0, 0) is the floor point under the centre of Leet's feet; it draws upward, 48px tall at
// scale 2. `facing: 'left'` mirrors the character (the extrusion stays on the right, like the
// blocks). `animate` false shows a still first frame (reduced motion or the scene is paused).
import { useReducedMotion } from '../app/useReducedMotion';
import { PixelPaths } from '../ui/PixelSprite';
import { SteppedFrames, frameSequence } from './SteppedFrames';
import {
  SCENE_LEET_ANCHOR,
  SCENE_LEET_FRAMES,
  SCENE_LEET_FRAMES_LEFT,
  SCENE_LEET_PALETTE,
  SCENE_LEET_SHADOW,
  type SceneLeetPose,
} from './sprites';

export type { SceneLeetPose } from './sprites';

const SHADOW_PALETTE = { '#': 'var(--ink)' } as const;
const SHADOW_W = SCENE_LEET_SHADOW[0].length;
const SHADOW_H = SCENE_LEET_SHADOW.length;

export function SceneLeet({
  pose,
  facing = 'right',
  animate = true,
  scale = 2,
}: {
  pose: SceneLeetPose;
  facing?: 'left' | 'right';
  animate?: boolean;
  scale?: 2 | 3;
}) {
  const reduced = useReducedMotion();
  const frames = (facing === 'left' ? SCENE_LEET_FRAMES_LEFT : SCENE_LEET_FRAMES)[pose];
  const fps = pose === 'walk' ? 6 : 3;
  return (
    <g data-scene-leet={pose} data-facing={facing}>
      <g opacity={0.4}>
        <PixelPaths frame={SCENE_LEET_SHADOW} palette={SHADOW_PALETTE} x={(-SHADOW_W / 2) * scale} y={(-SHADOW_H / 2) * scale} scale={scale} />
      </g>
      <SteppedFrames key={pose} sequence={frameSequence(pose)} fps={fps} animate={animate && !reduced}>
        {(f) => (
          <PixelPaths
            frame={frames[f]}
            palette={SCENE_LEET_PALETTE}
            x={-SCENE_LEET_ANCHOR.x * scale}
            y={-SCENE_LEET_ANCHOR.y * scale}
            scale={scale}
          />
        )}
      </SteppedFrames>
    </g>
  );
}

export default SceneLeet;
