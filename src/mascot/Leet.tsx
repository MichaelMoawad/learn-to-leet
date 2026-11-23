// Placeholder box until phase 3 (SPEC 5.3). Sprite is 24px, rendered at integer scales 2, 4 or 6.
import type { LeetPose } from '../content/schema';

export function Leet({ pose, scale = 2 }: { pose: LeetPose; scale?: 2 | 4 | 6 }) {
  const px = 24 * scale;
  return (
    <div
      role="img"
      aria-label={`Leet, ${pose}`}
      data-leet-pose={pose}
      className="shrink-0 border-2 border-dashed border-cyan-deep bg-bg-2"
      style={{ width: px, height: px }}
    />
  );
}

export default Leet;
