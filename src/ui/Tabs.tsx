import { useRef, type KeyboardEvent } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const tabPanelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * ARIA tablist with roving focus. Arrow keys move between tabs and are marked handled
 * (preventDefault) so page-level shortcuts leave them alone. The caller renders the panels
 * with `id={tabPanelId(prefix, id)}`, `role="tabpanel"` and `aria-labelledby={tabId(prefix, id)}`.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  idPrefix,
  label,
  className = '',
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange(id: T): void;
  idPrefix: string;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={`flex gap-1 ${className}`} onKeyDown={onKeyDown}>
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, t.id)}
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, t.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`h-9 border-2 px-4 font-label max-lg:h-10 text-xs uppercase tracking-[0.12em] ${
              selected
                ? 'border-cyan bg-bg-2 text-cyan'
                : 'border-line bg-bg-1 text-text-dim hover:border-line-bright hover:text-text'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
