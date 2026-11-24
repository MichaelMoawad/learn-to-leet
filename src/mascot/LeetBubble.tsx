// Leet's speech bubble (SPEC 5.3): pixel-cornered panel, sprite at 4x on the left, a "LEET" name
// tag and the line of text. Slides up 8px on entry; MotionConfig in App skips it under reduced motion.
import { motion } from 'motion/react';
import type { LeetPose } from '../content/schema';
import { Markdown } from '../ui/Markdown';
import { Leet } from './Leet';

export function LeetBubble({ pose, says }: { pose: LeetPose; says: string }) {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.26, ease: [0.3, 0.7, 0.4, 1] }}
      className="pixel-corners flex items-center gap-3 border-2 border-line bg-bg-1 p-3"
      data-leet-pose={pose}
    >
      <Leet pose={pose} scale={4} />
      <div className="min-w-0">
        <p className="label text-xs">Leet</p>
        <p className="mt-1 text-sm">
          <Markdown paragraphs={says} inline />
        </p>
      </div>
    </motion.div>
  );
}

export default LeetBubble;
