// Dev-only gallery (SPEC 1, /dev/visuals): every structure's sample scene sequences, with a step
// scrubber, prev / next, and the engine's own Replay / Pause. Samples live in src/visual/samples.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Visual } from '../visual/Visual';
import { sampleGroups } from '../visual/samples';
import { Button3D } from '../ui/Button3D';

type Frame = 'pane' | 'phone';

export default function DevVisuals() {
  const [kind, setKind] = useState(sampleGroups[0]?.kind ?? '');
  const group = sampleGroups.find((g) => g.kind === kind) ?? sampleGroups[0];
  const [sample, setSample] = useState(0);
  const [step, setStep] = useState(0);
  const [frame, setFrame] = useState<Frame>('pane');
  const current = group?.samples[sample] ?? group?.samples[0];
  const count = current?.scenes.length ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, count - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count]);

  const pick = (k: string) => {
    setKind(k);
    setSample(0);
    setStep(0);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="label text-xs">Dev only</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-xl font-semibold">Visual gallery</h1>
        <Link to="/" className="text-sm text-cyan underline">
          Home
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Structure">
        {sampleGroups.map((g) => (
          <button
            key={g.kind}
            type="button"
            onClick={() => pick(g.kind)}
            aria-pressed={g.kind === group?.kind}
            className={`h-8 border-2 px-3 font-label text-xs tracking-[0.12em] uppercase ${g.kind === group?.kind ? 'border-cyan bg-bg-2 text-cyan' : 'border-line bg-bg-1 text-text-dim hover:text-text'}`}
          >
            {g.kind}
          </button>
        ))}
      </div>

      {group && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Sample">
          {group.samples.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => {
                setSample(i);
                setStep(0);
              }}
              aria-pressed={i === sample}
              className={`border-2 px-3 py-1 text-sm ${i === sample ? 'border-magenta text-text' : 'border-line text-text-dim hover:text-text'}`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button3D variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>
          Prev
        </Button3D>
        <input
          type="range"
          min={0}
          max={Math.max(count - 1, 0)}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          aria-label="Step"
          className="min-w-40 flex-1 accent-cyan"
        />
        <Button3D variant="primary" size="sm" onClick={() => setStep((s) => Math.min(s + 1, count - 1))} disabled={step >= count - 1}>
          Next
        </Button3D>
        <span className="label text-xs whitespace-nowrap">
          Step {step + 1} / {count}
        </span>
        <label className="flex items-center gap-2 text-sm text-text-dim">
          <input type="checkbox" checked={frame === 'phone'} onChange={(e) => setFrame(e.target.checked ? 'phone' : 'pane')} />
          Phone frame (358 by 388)
        </label>
      </div>

      {current && (
        <div className={`mt-4 border-2 border-dashed border-line ${frame === 'phone' ? 'h-[388px] w-[358px]' : 'h-[600px] w-full'}`}>
          <Visual key={`${group?.kind}/${sample}`} scenes={current.scenes} index={Math.min(step, count - 1)} />
        </div>
      )}
    </main>
  );
}
