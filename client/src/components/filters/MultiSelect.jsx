import { useMemo, useState } from 'react';

/**
 * Searchable multi-select with live counts. Used for cities, states and exams,
 * where the list is long enough that scrolling is worse than typing.
 */
export default function MultiSelect({
  options,
  selected = [],
  onToggle,
  placeholder = 'Search…',
  emptyLabel = 'Nothing matches that.',
  showClear = true,
  onClear,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  // Anything already selected stays visible even when it falls outside the
  // search, otherwise there is no way to switch it off again.
  const visible = useMemo(() => {
    const shown = new Set(filtered.map((option) => option.value));
    const pinned = options.filter((option) => selected.includes(option.value) && !shown.has(option.value));
    return [...pinned, ...filtered];
  }, [filtered, options, selected]);

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-rule pb-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full bg-transparent font-mono text-[0.7rem] tracking-[0.06em] placeholder:text-ink-faint focus:outline-none"
        />
        {showClear && selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-vermilion"
          >
            Clear
          </button>
        )}
      </div>

      <ul className="mt-2 max-h-60 space-y-0.5 overflow-y-auto pr-1" data-lenis-prevent>
        {visible.map((option) => {
          const active = selected.includes(option.value);
          const empty = option.count === 0 && !active;

          return (
            <li key={option.value}>
              <label
                className={`flex cursor-pointer items-center justify-between gap-3 px-2 py-1.5 text-[0.8rem] transition-colors ${
                  active ? 'bg-ink text-paper' : empty ? 'text-ink-faint' : 'text-ink-soft hover:bg-paper-2'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggle(option.value)}
                    className="h-3.5 w-3.5 accent-vermilion"
                  />
                  <span>{option.label}</span>
                  {option.grouped && (
                    <span
                      className={`font-mono text-[0.55rem] uppercase tracking-[0.12em] ${
                        active ? 'text-paper/60' : 'text-ink-faint'
                      }`}
                    >
                      group
                    </span>
                  )}
                </span>
                {option.count != null && (
                  <span className={`font-mono text-[0.62rem] tabular-nums ${active ? 'text-paper/70' : 'text-ink-faint'}`}>
                    {option.count}
                  </span>
                )}
              </label>
            </li>
          );
        })}

        {visible.length === 0 && (
          <li className="px-2 py-3 font-mono text-[0.68rem] text-ink-faint">{emptyLabel}</li>
        )}
      </ul>
    </div>
  );
}
