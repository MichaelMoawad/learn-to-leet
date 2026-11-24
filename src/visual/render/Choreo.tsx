// Choreography overlays driven by the scene clock (t, ms since the step started): rings pulsing
// on looked-up slots, miss flashes on hash maps, and glowing tokens flying along an arc.
// Pausing the scene stops the clock, which freezes all of these mid-flight.
import { arcPoint, easeInOut, type ChoreoPlan } from '../choreo';
import { monoWidth } from '../metrics';
import { C, FACES } from '../tones';
import type { Tone } from '../../content/schema';

const toneColor = (t: Tone) => (t === 'idle' || t === 'muted' ? C.cyan : FACES[t].accent);

export function PulseLayer({ plan, t }: { plan: ChoreoPlan; t: number }) {
  return (
    <g aria-hidden="true" pointerEvents="none">
      {plan.pulses.map((p) =>
        [0, 0.28].map((lag) => {
          const q = (t - p.start) / p.dur - lag;
          if (q < 0 || q >= 1) return null;
          const s = 1 + q * 1.1;
          const color = toneColor(p.tone);
          return (
            <path
              key={`${p.key}-${lag}`}
              data-pulse={p.target}
              d={`M0 ${-14 * s}L${28 * s} 0L0 ${14 * s}L${-28 * s} 0Z`}
              transform={`translate(${p.at[0]} ${p.at[1]})`}
              fill="none"
              stroke={color}
              strokeWidth={3 - q * 2}
              opacity={1 - q}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          );
        }),
      )}
      {plan.misses.map((m) => {
        const q = (t - m.start) / m.dur;
        if (q < 0 || q >= 1) return null;
        const s = 0.6 + q * 0.9;
        return (
          <g key={m.key} data-miss={m.sid} transform={`translate(${m.at[0]} ${m.at[1]})`} opacity={1 - q}>
            <ellipse rx={70 * s} ry={35 * s} fill="none" stroke={C.red} strokeWidth={3 - q * 2} style={{ filter: `drop-shadow(0 0 6px ${C.red})` }} />
          </g>
        );
      })}
    </g>
  );
}

export function FlightLayer({ plan, t }: { plan: ChoreoPlan; t: number }) {
  return (
    <g aria-hidden="true" pointerEvents="none">
      {plan.flights.map((f) => {
        const q = (t - f.start) / f.dur;
        if (q < 0 || q >= 1) return null;
        const u = easeInOut(q);
        const [x, y] = arcPoint(f.from, f.to, u);
        const color = toneColor(f.tone);
        const w = f.text ? Math.max(24, monoWidth(f.text, 13) + 12) : 12;
        const h = f.text ? 22 : 12;
        return (
          <g key={f.key} data-flight={f.target ?? f.key}>
            {[0.05, 0.1, 0.15, 0.2].map((lag, i) => {
              const v = u - lag;
              if (v <= 0) return null;
              const [tx, ty] = arcPoint(f.from, f.to, v);
              return <circle key={lag} cx={tx} cy={ty} r={4 - i * 0.7} fill={color} opacity={0.55 - i * 0.12} />;
            })}
            <g transform={`translate(${x} ${y})`} style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
              <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={color} stroke={C.ink} strokeWidth={2} />
              {f.text && (
                <text textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-mono)" fontWeight={700} fontSize={13} fill={C.ink}>
                  {f.text}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
}
