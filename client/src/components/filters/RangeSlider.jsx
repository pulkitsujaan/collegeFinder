import { useId } from 'react';

/**
 * Range input built on two native sliders sharing one visual track, so arrow
 * keys, Home/End and screen readers all work without reimplementing them.
 *
 * `mode="min"` renders a single handle for open-ended filters ("highest package
 * above …"), where a second handle would be a control that does nothing.
 */
export default function RangeSlider({
  min,
  max,
  low,
  high,
  step = 1,
  onChange,
  onCommit,
  mode = 'range',
  label,
  format = (value) => String(value),
  unitLabel = '',
}) {
  const id = useId();

  const boundLow = low ?? min;
  const boundHigh = high ?? max;
  const span = Math.max(1, max - min);

  const startPct = ((boundLow - min) / span) * 100;
  const endPct = ((boundHigh - min) / span) * 100;

  const commitLow = (next) => {
    const value = Math.min(Number(next), boundHigh);
    if (mode === 'min') onChange(value <= min ? null : value);
    // A handle parked at its extreme means "no bound", which keeps the URL
    // reading like "fees under X" rather than "fees from 0 to X".
    else onChange([value <= min ? null : value, high ?? null]);
  };

  const commitHigh = (next) => {
    const value = Math.max(Number(next), boundLow);
    onChange([low ?? null, value >= max ? null : value]);
  };

  const readout =
    mode === 'min'
      ? low == null
        ? 'Any'
        : `from ${format(boundLow)}`
      : low == null && high == null
        ? 'Any'
        : `${format(boundLow)} – ${high == null ? format(max) : format(boundHigh)}`;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft">
          {label}
        </span>
        <span className="font-mono text-[0.68rem] tabular-nums text-ink">{readout}</span>
      </div>

      <div className="relative h-5">
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-rule"
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-px -translate-y-1/2 bg-ink"
          style={{
            left: mode === 'min' ? '0%' : `${startPct}%`,
            width: mode === 'min' ? `${startPct}%` : `${Math.max(0, endPct - startPct)}%`,
          }}
        />
        <input
          id={`${id}-low`}
          type="range"
          className="range-thumb"
          min={min}
          max={max}
          step={step}
          value={boundLow}
          onChange={(event) => commitLow(event.target.value)}
          onBlur={onCommit}
          aria-label={`${label} minimum${unitLabel ? ` in ${unitLabel}` : ''}`}
        />
        {mode === 'range' && (
          <input
            id={`${id}-high`}
            type="range"
            className="range-thumb"
            min={min}
            max={max}
            step={step}
            value={boundHigh}
            onChange={(event) => commitHigh(event.target.value)}
            onBlur={onCommit}
            aria-label={`${label} maximum${unitLabel ? ` in ${unitLabel}` : ''}`}
          />
        )}
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-[0.58rem] tracking-[0.1em] text-ink-faint">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
