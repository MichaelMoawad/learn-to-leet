// Stepped frame animation for pixel sprites, done with SVG <animate> so it runs off the render
// path (no timers, no re-renders). Every frame is drawn once; each toggles its own visibility.
import type { ReactNode } from 'react';

/** Frame order for one loop. Idle holds its open-eyed frame and blinks once every 3 seconds. */
export function frameSequence(pose: string): number[] {
  return pose === 'idle' ? [0, 0, 0, 0, 0, 0, 0, 0, 1] : [0, 1];
}

export function SteppedFrames({
  sequence,
  fps,
  animate,
  children,
}: {
  sequence: number[];
  fps: number;
  animate: boolean;
  children: (frame: number) => ReactNode;
}) {
  if (!animate || sequence.length < 2) return <>{children(sequence[0] ?? 0)}</>;
  const frames = [...new Set(sequence)];
  const dur = `${(sequence.length / fps).toFixed(3)}s`;
  const keyTimes = sequence.map((_, i) => (i / sequence.length).toFixed(4)).join(';');
  return (
    <>
      {frames.map((f) => (
        <g key={f} visibility={f === sequence[0] ? 'visible' : 'hidden'}>
          <animate
            attributeName="visibility"
            values={sequence.map((s) => (s === f ? 'visible' : 'hidden')).join(';')}
            keyTimes={keyTimes}
            dur={dur}
            calcMode="discrete"
            repeatCount="indefinite"
          />
          {children(f)}
        </g>
      ))}
    </>
  );
}
