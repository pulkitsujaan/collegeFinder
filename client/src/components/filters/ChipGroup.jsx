/**
 * A multi-select chip group. Options that would return nothing are dimmed
 * rather than hidden, so the shape of the catalogue stays stable while the
 * student narrows it — losing options as you filter is disorienting.
 */
export default function ChipGroup({ options, selected = [], onToggle, columns }) {
  return (
    <ul
      className={`flex flex-wrap gap-1.5 ${columns ? 'sm:grid sm:gap-1.5' : ''}`}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const active = selected.includes(option.value);
        const empty = option.count === 0 && !active;

        return (
          <li key={option.value}>
            <button
              type="button"
              onClick={() => onToggle(option.value)}
              aria-pressed={active}
              className={`w-full border px-3 py-2 text-left font-mono text-[0.66rem] uppercase tracking-[0.1em] transition-all duration-150 ease-editorial ${
                active
                  ? 'border-ink bg-ink text-paper'
                  : empty
                    ? 'border-rule-soft text-ink-faint hover:border-rule'
                    : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate">{option.label}</span>
                {option.count != null && (
                  <span className={`tabular-nums ${active ? 'text-paper/70' : 'text-ink-faint'}`}>
                    {option.count}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
