import { useState } from 'react';
import type { Challenge, Json, Language } from '../content/schema';
import type { TestResult, TestStatus } from './protocol';

/** JSON shown the way the chosen language would print it. */
export function formatValue(v: Json | undefined, language: Language): string {
  if (v === undefined) return '';
  const py = language === 'python';
  const fmt = (x: Json): string => {
    if (x === null) return py ? 'None' : 'null';
    if (typeof x === 'boolean') return py ? (x ? 'True' : 'False') : String(x);
    if (typeof x === 'number' || typeof x === 'string') return JSON.stringify(x);
    if (Array.isArray(x)) return '[' + x.map(fmt).join(', ') + ']';
    return '{' + Object.entries(x).map(([k, y]) => `${JSON.stringify(k)}: ${fmt(y)}`).join(', ') + '}';
  };
  return fmt(v);
}

// Browsers coarsen timers without cross-origin isolation, so tiny times read as "<0.1 ms".
const formatMs = (ms: number) => (ms < 0.1 ? '<0.1 ms' : ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`);

// 8 by 8 pixel glyphs, one string per row.
const GLYPHS: Record<'tick' | 'cross' | 'clock' | 'dot' | 'dash', string[]> = {
  tick: ['........', '.......#', '......##', '#....##.', '##..##..', '.####...', '..##....', '........'],
  cross: ['........', '.##..##.', '..####..', '...##...', '..####..', '.##..##.', '........', '........'],
  clock: ['..####..', '.#....#.', '#...#..#', '#...#..#', '#...##.#', '#......#', '.#....#.', '..####..'],
  dot: ['........', '........', '...##...', '..####..', '..####..', '...##...', '........', '........'],
  dash: ['........', '........', '........', '.######.', '.######.', '........', '........', '........'],
};

const STATUS: Record<TestStatus, { glyph: keyof typeof GLYPHS; color: string; label: string }> = {
  pending: { glyph: 'dot', color: 'text-line', label: 'Not run' },
  running: { glyph: 'dot', color: 'text-cyan animate-pulse', label: 'Running' },
  pass: { glyph: 'tick', color: 'text-green', label: 'Passed' },
  fail: { glyph: 'cross', color: 'text-red', label: 'Failed' },
  error: { glyph: 'cross', color: 'text-red', label: 'Error' },
  timeout: { glyph: 'clock', color: 'text-amber', label: 'Timed out' },
  skipped: { glyph: 'dash', color: 'text-text-dim', label: 'Skipped' },
};

export function PixelIcon({ glyph, className = '' }: { glyph: keyof typeof GLYPHS; className?: string }) {
  const rows = GLYPHS[glyph];
  return (
    <svg viewBox="0 0 8 8" width="16" height="16" className={className} shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === '#' ? <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)),
      )}
    </svg>
  );
}

function Field({ label, children, tone = 'text-text' }: { label: string; children: string; tone?: string }) {
  return (
    <div>
      <p className="label text-[10px]">{label}</p>
      <pre className={`mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs ${tone}`}>{children}</pre>
    </div>
  );
}

function Row({ result, challenge, args, language }: { result: TestResult; challenge: Challenge; args: Json[]; language: Language }) {
  const [open, setOpen] = useState(false);
  const s = STATUS[result.status];
  const ran = result.status === 'pass' || result.status === 'fail' || result.status === 'error';
  return (
    <li className="border-t-2 border-line first:border-t-0" data-status={result.status}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg-2"
      >
        <PixelIcon glyph={s.glyph} className={`shrink-0 ${s.color}`} />
        <span className="sr-only">{s.label}:</span>
        <span className="min-w-0 flex-1 truncate text-sm">{result.name}</span>
        {result.ms !== undefined && result.status !== 'skipped' && (
          <span className="shrink-0 font-mono text-xs text-text-dim">
            {result.status === 'timeout' ? `>${result.ms} ms` : formatMs(result.ms)}
          </span>
        )}
        <span className={`shrink-0 font-mono text-xs text-text-dim transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">
          ›
        </span>
      </button>
      {open && (
        <div className="grid gap-3 bg-bg-0/40 px-3 pt-1 pb-3 sm:pl-10">
          <Field label="Input">
            {challenge.params.map((p, i) => `${p.name} = ${formatValue(args[i], language)}`).join('\n')}
          </Field>
          <Field label="Expected">{formatValue(result.expected, language)}</Field>
          {ran && result.actual !== undefined && (
            <Field label="Returned" tone={result.status === 'pass' ? 'text-green' : 'text-red'}>
              {formatValue(result.actual, language)}
            </Field>
          )}
          {result.error && (
            <Field label="Error" tone="text-red">
              {result.error.line ? `Line ${result.error.line}: ${result.error.message}` : result.error.message}
            </Field>
          )}
          {result.stdout && <Field label="Printed">{result.stdout.replace(/\n$/, '')}</Field>}
          {result.status === 'skipped' && <p className="text-xs text-text-dim">Skipped because an earlier test stopped the run.</p>}
          {result.status === 'pending' && <p className="text-xs text-text-dim">Press Run to try this test.</p>}
        </div>
      )}
    </li>
  );
}

export function TestList({ results, challenge, language }: { results: TestResult[]; challenge: Challenge; language: Language }) {
  const passed = results.filter((r) => r.status === 'pass').length;
  const ran = results.some((r) => r.status !== 'pending');
  const allPass = ran && passed === results.length;
  return (
    <section className="pixel-corners border-2 border-line bg-bg-1" aria-label="Tests">
      <header className="flex items-center justify-between gap-3 border-b-2 border-line px-3 py-2">
        <p className="label text-xs">Tests</p>
        <p className={`font-mono text-sm ${allPass ? 'text-green' : ran ? 'text-text' : 'text-text-dim'}`} aria-live="polite" data-testid="test-summary">
          {ran ? `${passed} / ${results.length} passed` : `${results.length} tests`}
        </p>
      </header>
      <ul>
        {results.map((r, i) => (
          <Row key={i} result={r} challenge={challenge} args={challenge.tests[i]?.args ?? []} language={language} />
        ))}
      </ul>
    </section>
  );
}

export default TestList;
