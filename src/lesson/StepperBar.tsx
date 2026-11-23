import { Button3D } from '../ui/Button3D';
import { ProgressSegments } from '../ui/ProgressSegments';

/** Fixed bottom bar: Back, one segment per step, "STEP 3 / 9", Next (or the last-step action). */
export function StepperBar({
  labels,
  index,
  onGo,
  lastLabel,
  onLast,
}: {
  labels: string[];
  index: number;
  onGo(index: number): void;
  lastLabel: string;
  onLast(): void;
}) {
  const count = labels.length;
  const isLast = index === count - 1;
  return (
    <nav
      aria-label="Lesson steps"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg-0/95 pt-3 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Button3D variant="ghost" size="md" onClick={() => onGo(index - 1)} disabled={index === 0} aria-label="Previous step">
          Back
        </Button3D>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0 lg:flex-row lg:gap-4">
          <ProgressSegments labels={labels} current={index} onSelect={onGo} className="min-w-0" />
          <p className="label shrink-0 text-xs whitespace-nowrap" aria-live="polite">
            Step {index + 1} / {count}
          </p>
        </div>
        {isLast ? (
          <Button3D variant="success" size="md" onClick={onLast}>
            {lastLabel}
          </Button3D>
        ) : (
          <Button3D variant="primary" size="md" onClick={() => onGo(index + 1)} aria-label="Next step">
            Next
          </Button3D>
        )}
      </div>
    </nav>
  );
}

export default StepperBar;
