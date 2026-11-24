import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { useReducedMotion } from './useReducedMotion';
import { useStore } from './store';

/**
 * Motion settings for every animated subtree (lesson page, dev gallery). Kept out of App so the
 * home page bundle does not pull in the motion library.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const pref = useStore((s) => s.prefs.motion);
  // 'full' forces animation even if the OS asks for less; otherwise follow the effective setting.
  const reducedMotion = reduced ? 'always' : pref === 'full' ? 'never' : 'user';
  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}

export default MotionRoot;
