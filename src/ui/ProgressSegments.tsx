/** One clickable segment per step. Earlier steps fill cyan, the current one is magenta. */
export function ProgressSegments({
  labels,
  current,
  onSelect,
  className = '',
}: {
  labels: string[]; // accessible name per segment, e.g. step titles
  current: number; // 0-based
  onSelect(index: number): void;
  className?: string;
}) {
  return (
    <ol className={`flex w-full items-center gap-1 ${className}`} aria-label="Steps">
      {labels.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={i} className="flex-1">
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Step ${i + 1}: ${label}`}
              aria-current={state === 'current' ? 'step' : undefined}
              data-state={state}
              className="group block w-full py-2 max-lg:py-4"
            >
              <span
                className={`block h-2 border-2 ${
                  state === 'done'
                    ? 'border-cyan-deep bg-cyan'
                    : state === 'current'
                      ? 'border-magenta-deep bg-magenta'
                      : 'border-line bg-bg-2 group-hover:border-line-bright'
                }`}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default ProgressSegments;
