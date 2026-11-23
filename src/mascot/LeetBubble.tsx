// Placeholder until phase 3 (SPEC 5.3) draws the real sprite. Keep these props.
import type { LeetPose } from '../content/schema';
import { Markdown } from '../ui/Markdown';
import { Leet } from './Leet';

export function LeetBubble({ pose, says }: { pose: LeetPose; says: string }) {
  return (
    <div className="pixel-corners flex items-start gap-3 border-2 border-line bg-bg-1 p-3" data-leet-pose={pose}>
      <Leet pose={pose} scale={2} />
      <div>
        <p className="label text-xs">Leet</p>
        <p className="mt-1 text-sm">
          <Markdown paragraphs={says} inline />
        </p>
      </div>
    </div>
  );
}

export default LeetBubble;
