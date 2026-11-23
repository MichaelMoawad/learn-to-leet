// Pure helpers for lesson navigation, kept out of components so they are easy to test.

/** Parses `?step=N` (1-based) into a 0-based index, or null when absent or out of range. */
export function stepFromSearch(search: string, count: number): number | null {
  const raw = new URLSearchParams(search).get('step');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= count ? n - 1 : null;
}

/** True when a key event comes from somewhere that owns its own arrow keys. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  if (target.closest('.cm-editor, input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return true;
  return false;
}
