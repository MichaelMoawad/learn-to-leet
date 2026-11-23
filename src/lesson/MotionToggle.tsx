import { useStore } from '../app/store';
import { nextMotionPref, useReducedMotion } from '../app/useReducedMotion';

const label = { auto: 'Auto', reduced: 'Reduced', full: 'Full' } as const;

/** Cycles prefs.motion: auto, reduced, full. */
export function MotionToggle() {
  const pref = useStore((s) => s.prefs.motion);
  const setMotion = useStore((s) => s.setMotion);
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      onClick={() => setMotion(nextMotionPref[pref])}
      title={`Motion: ${label[pref]}${pref === 'auto' ? (reduced ? ' (reduced by your system)' : ' (follows your system)') : ''}. Click to change.`}
      aria-label={`Motion: ${label[pref]}. Change motion setting`}
      data-motion-pref={pref}
      className="h-8 border-2 border-line bg-bg-1 px-2 whitespace-nowrap font-label sm:px-3 text-xs uppercase tracking-[0.12em] text-text-dim hover:border-cyan hover:text-cyan"
    >
      Motion <span className="text-cyan">{label[pref]}</span>
    </button>
  );
}

export default MotionToggle;
