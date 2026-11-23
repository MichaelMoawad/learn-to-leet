import { useEffect, useSyncExternalStore } from 'react';
import { useStore, type MotionPref } from './store';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}
const osPrefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches;

/** Pure rule from SPEC 5.1: reduced when the pref says so, or 'auto' and the OS asks for it. */
export function isReducedMotion(pref: MotionPref, osReduced: boolean): boolean {
  return pref === 'reduced' || (pref === 'auto' && osReduced);
}

/** True when reduced motion is in effect. Safe to call from any component. */
export function useReducedMotion(): boolean {
  const pref = useStore((s) => s.prefs.motion);
  const os = useSyncExternalStore(subscribe, osPrefersReduced, () => false);
  return isReducedMotion(pref, os);
}

/** Call once at the app root: mirrors the effective setting to `<html data-motion="reduced">`. */
export function useMotionAttribute(): boolean {
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = document.documentElement;
    if (reduced) el.dataset.motion = 'reduced';
    else delete el.dataset.motion;
  }, [reduced]);
  return reduced;
}

export const nextMotionPref: Record<MotionPref, MotionPref> = { auto: 'reduced', reduced: 'full', full: 'auto' };

export default useReducedMotion;
