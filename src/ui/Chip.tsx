import type { ReactNode } from 'react';
import type { Difficulty } from '../content/schema';

export type ChipTone = 'cyan' | 'magenta' | 'green' | 'red' | 'amber' | 'violet' | 'dim';

const toneClass: Record<ChipTone, string> = {
  cyan: 'border-cyan-deep text-cyan',
  magenta: 'border-magenta-deep text-magenta',
  green: 'border-green-deep text-green',
  red: 'border-red-deep text-red',
  amber: 'border-amber-deep text-amber',
  violet: 'border-violet-deep text-violet',
  dim: 'border-line text-text-dim',
};

export const difficultyTone: Record<Difficulty, ChipTone> = { easy: 'green', medium: 'amber', hard: 'red' };

/** Small Silkscreen tag: difficulty, minutes, step count, state. */
export function Chip({ tone = 'dim', className = '', children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center border-2 bg-bg-1 px-2 font-label text-xs uppercase leading-none tracking-[0.12em] whitespace-nowrap ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export default Chip;
