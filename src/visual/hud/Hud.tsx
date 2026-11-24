// HUD over the scene (SPEC 3.0 items 4 and 7): stat tiles for the step vars, the caption pill,
// the legend and the Replay / Pause buttons. Plain HTML layered over the SVG.
import { motion } from 'motion/react';
import { useRef } from 'react';
import type { Tone, Var } from '../../content/schema';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/icons';
import { Button3D } from '../../ui/Button3D';
import { C, FACES, TONE_LABELS } from '../tones';

export const toneAccent = (tone?: Tone) => (!tone || tone === 'idle' || tone === 'muted' ? C.lineBright : FACES[tone].accent);

/** Pixel icon for a var name. */
export function varIcon(name: string): IconName {
  const n = name.toLowerCase();
  if (n === 'target') return 'target';
  if (n === 'need') return 'need';
  if (n === 'sum' || n === 'total') return 'sum';
  if (['i', 'j', 'k', 'left', 'right', 'lo', 'hi', 'mid', 'l', 'r'].includes(n)) return 'index';
  if (n === 'count' || n === 'len' || n === 'length' || n === 'n') return 'count';
  return 'var';
}

/** Tile sizes, used both to draw tiles and to reserve room for them (so the view never shifts). */
export const tileSize = (narrow: boolean) => (narrow ? { w: 80, h: 40 } : { w: 112, h: 56 });

export function VarTile({ v, narrow, reduced }: { v: Var; narrow: boolean; reduced: boolean }) {
  const color = toneAccent(v.tone);
  const prev = useRef<{ value: Var['value']; n: number }>({ value: v.value, n: 0 });
  if (prev.current.value !== v.value) prev.current = { value: v.value, n: prev.current.n + 1 };
  const flash = prev.current.n;
  const size = tileSize(narrow);
  const valueColor = v.tone && v.tone !== 'idle' && v.tone !== 'muted' ? color : C.text;
  return (
    <div
      data-var={v.name}
      className="pixel-corners relative flex items-center gap-2 overflow-hidden border-2 border-line bg-bg-1/90 pr-2 pl-3"
      style={{ minWidth: size.w, height: size.h }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[4px]" style={{ background: color }} />
      {flash > 0 && !reduced && (
        <motion.span
          key={flash}
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: color }}
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
      <span className="relative shrink-0" style={{ color }}>
        <Icon name={varIcon(v.name)} scale={narrow ? 1 : 2} />
      </span>
      <span className="relative flex min-w-0 flex-col leading-none">
        <span className="font-label tracking-[0.12em] text-text-dim uppercase" style={{ fontSize: 11 }}>
          {v.name}
        </span>
        <span className="font-mono font-bold whitespace-nowrap" style={{ fontSize: narrow ? 16 : 22, color: valueColor, marginTop: narrow ? 2 : 4 }}>
          {v.value}
        </span>
      </span>
    </div>
  );
}

export function Caption({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p
      data-testid="scene-caption"
      className="mx-auto w-fit max-w-full rounded-full border-2 border-line-bright bg-bg-1/90 px-4 py-0.5 text-center font-mono text-xs leading-snug text-text lg:py-1 lg:text-sm"
    >
      {text}
    </p>
  );
}

/** A tiny lit block in a tone, for the legend. */
function Swatch({ tone }: { tone: Tone }) {
  const f = FACES[tone];
  return (
    <svg width={18} height={16} viewBox="-10 -2 20 18" aria-hidden="true" opacity={f.opacity}>
      <path d="M0 0L9 4.5L0 9L-9 4.5Z" fill={f.top} />
      <path d="M-9 4.5L0 9L0 14L-9 9.5Z" fill={f.left} />
      <path d="M0 9L9 4.5L9 9.5L0 14Z" fill={f.right} />
      <path d="M0 0L9 4.5L9 9.5L0 14L-9 9.5L-9 4.5Z" fill="none" stroke={f.outline} strokeWidth={1.2} />
    </svg>
  );
}

export function Legend({ tones }: { tones: Tone[]; narrow?: boolean }) {
  const items = TONE_LABELS.filter(([t]) => tones.includes(t));
  if (!items.length) return null;
  return (
    <ul data-testid="scene-legend" aria-label="Legend" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map(([tone, label]) => (
        <li key={tone} className="flex items-center gap-1 font-label tracking-[0.12em] text-text-dim uppercase" style={{ fontSize: 10 }}>
          <Swatch tone={tone} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Rough legend width per item, for reserving rows. */
export const legendItemWidth = (label: string, narrow: boolean) => 18 + 4 + label.length * 10 * 0.95 + (narrow ? 10 : 12);

export function Controls({ paused, onReplay, onPause, narrow }: { paused: boolean; onReplay(): void; onPause(): void; narrow: boolean }) {
  return (
    <div className="flex gap-2">
      <Button3D variant="ghost" size="sm" onClick={onReplay} aria-label="Replay step" title="Replay step">
        <span className="flex items-center gap-1.5">
          <Icon name="replay" />
          {!narrow && <span>Replay</span>}
        </span>
      </Button3D>
      <Button3D variant="ghost" size="sm" onClick={onPause} aria-label={paused ? 'Play scene' : 'Pause scene'} aria-pressed={paused} title={paused ? 'Play' : 'Pause'}>
        <span className="flex items-center gap-1.5">
          <Icon name={paused ? 'play' : 'pause'} />
          {!narrow && <span>{paused ? 'Play' : 'Pause'}</span>}
        </span>
      </Button3D>
    </div>
  );
}
