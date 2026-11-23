import type { MouseEvent } from 'react';
import type { NavigateFunction } from 'react-router';

/** onClick for an <a> (e.g. Button3D with href) that navigates client-side but keeps new-tab clicks. */
export function clientNav(navigate: NavigateFunction, to: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
}
