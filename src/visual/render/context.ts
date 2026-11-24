// Motion settings shared by every primitive (SPEC 3.4).
import { createContext, useContext } from 'react';
import type { Transition } from 'motion/react';

export interface SceneMotion {
  /** Every duration is zero: reduced motion, or Replay snapping back to the previous step. */
  instant: boolean;
  /** Reduced motion: also no glows, bobs or idle loops. */
  reduced: boolean;
  paused: boolean;
  /** Text boost (>= 1, see metrics.textBoost) so small text stays legible on phones. */
  k: number;
}

export const SceneMotionContext = createContext<SceneMotion>({ instant: false, reduced: false, paused: false, k: 1 });
export const useSceneMotion = () => useContext(SceneMotionContext);

export const SPRING: Transition = { type: 'spring', stiffness: 300, damping: 26 };
export const COLOR: Transition = { duration: 0.2, ease: 'linear' };
/** Path shapes (zones, edges) follow moving endpoints with a tween, about as long as the spring. */
export const PATH: Transition = { duration: 0.35, ease: [0.2, 0.8, 0.3, 1] };
export const HEIGHT: Transition = { duration: 0.2, ease: 'easeOut' };
export const NONE: Transition = { duration: 0 };

/** Pick a transition, or zero when instant. */
export const tr = (instant: boolean, t: Transition): Transition => (instant ? NONE : t);
