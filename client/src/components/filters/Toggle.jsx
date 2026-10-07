/**
 * A single on/off filter. Rendered as a switch rather than a checkbox because
 * it reads as "turn this lens on", not as one option among many.
 */
export default function Toggle({ label, checked, onChange, count }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="flex items-center gap-2 text-[0.82rem] text-ink-soft">
        {label}
        {count != null && (
          <span className="font-mono text-[0.6rem] tabular-nums text-ink-faint">{count}</span>
        )}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="block h-5 w-9 border border-rule bg-paper-2 transition-colors duration-150 peer-checked:border-forest peer-checked:bg-forest peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-vermilion"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 h-3.5 w-3.5 bg-ink transition-transform duration-150 ease-editorial peer-checked:translate-x-4 peer-checked:bg-paper"
        />
      </span>
    </label>
  );
}
