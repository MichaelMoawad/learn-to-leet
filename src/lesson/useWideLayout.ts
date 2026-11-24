import { useSyncExternalStore } from 'react';

/** The two-column lesson layout starts here. Keep in step with `--breakpoint-lg` in tokens.css. */
export const WIDE_QUERY = '(min-width: 1024px)';

function subscribe(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(WIDE_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}
const read = () => typeof window !== 'undefined' && !!window.matchMedia?.(WIDE_QUERY).matches;

/**
 * True at 1024px and up. Layout itself is pure CSS; this only switches ARIA roles (tab panels on
 * phones, plain regions on desktop) so nothing remounts when the window crosses the breakpoint.
 */
export function useWideLayout(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
