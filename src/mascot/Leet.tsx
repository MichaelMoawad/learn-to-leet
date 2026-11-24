// Leet, front view (SPEC 5.3). 24px sprite at integer scales 2, 4 or 6; 3 fps stepped frames,
// a still first frame under reduced motion.
import type { LeetPose } from '../content/schema';
import { useReducedMotion } from '../app/useReducedMotion';
import { PixelPaths } from '../ui/PixelSprite';
import { LEET_FRAMES, LEET_PALETTE } from './sprites';
import { SteppedFrames, frameSequence } from './SteppedFrames';

const LABEL: Record<LeetPose, string> = {
  idle: 'Leet the robot, smiling',
  hint: 'Leet the robot, pointing up with an idea',
  cheer: 'Leet the robot, cheering',
  oops: 'Leet the robot, looking dazed',
};

export function Leet({ pose, scale = 2 }: { pose: LeetPose; scale?: 2 | 4 | 6 }) {
  const reduced = useReducedMotion();
  const px = 24 * scale;
  const frames = LEET_FRAMES[pose];
  return (
    <svg
      role="img"
      aria-label={LABEL[pose]}
      data-leet-pose={pose}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      className="shrink-0"
    >
      <SteppedFrames key={pose} sequence={frameSequence(pose)} fps={3} animate={!reduced}>
        {(f) => <PixelPaths frame={frames[f]} palette={LEET_PALETTE} />}
      </SteppedFrames>
    </svg>
  );
}

export default Leet;
