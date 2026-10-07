import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useSuggest } from '../../api/hooks.js';

const TYPE_LABEL = { college: 'College', city: 'City', course: 'Course' };

/**
 * Debounced text search with a typeahead. Suggestions are mixed on the server
 * (colleges, cities, courses) so a query like "pune" offers the city shortcut
 * as well as individual colleges.
 */
export default function SearchBox({
  value = '',
  onChange,
  placeholder = 'Search colleges, cities or courses',
  autoFocus = false,
  variant = 'default',
}) {
  const [term, setTerm] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listId = useId();

  // The URL is the source of truth; follow it when it changes underneath us
  // (a pill removed, back button, a suggestion clicked).
  useEffect(() => setTerm(value), [value]);

  const { data, isFetching } = useSuggest(term);
  const suggestions = open ? (data?.items ?? []) : [];

  useEffect(() => {
    if (onChange == null) return undefined;
    if (term === value) return undefined;
    const timer = setTimeout(() => onChange(term), 280);
    return () => clearTimeout(timer);
  }, [term, value, onChange]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => {
        if (!suggestions.length) return -1;
        const next = index + delta;
        if (next < 0) return suggestions.length - 1;
        if (next >= suggestions.length) return 0;
        return next;
      });
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      setOpen(false);
      // Let the link do the navigating.
      containerRef.current
        ?.querySelector(`[data-suggestion="${activeIndex}"]`)
        ?.click();
    }
  };

  const large = variant === 'hero';

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-3 border-b border-ink pb-2">
        <input
          type="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={placeholder}
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          role="combobox"
          className={`w-full min-w-0 bg-transparent placeholder:text-ink-faint focus:outline-none ${
            large ? 'font-display text-2xl tracking-[-0.01em] sm:text-3xl' : 'text-base'
          }`}
        />
        {isFetching && (
          <span className="shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">
            …
          </span>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          data-lenis-prevent
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-80 overflow-y-auto border border-rule bg-paper shadow-lift"
        >
          {suggestions.map((item, index) => (
            <li key={`${item.type}-${item.slug ?? item.label}`} role="none">
              <Link
                to={item.href}
                data-suggestion={index}
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-baseline justify-between gap-4 px-4 py-2.5 transition-colors ${
                  index === activeIndex ? 'bg-ink text-paper' : 'hover:bg-paper-2'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.9rem]">{item.label}</span>
                  {item.sublabel && (
                    <span
                      className={`font-mono text-[0.6rem] uppercase tracking-[0.12em] ${
                        index === activeIndex ? 'text-paper/60' : 'text-ink-faint'
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] ${
                    index === activeIndex ? 'text-paper/60' : 'text-ink-faint'
                  }`}
                >
                  {TYPE_LABEL[item.type] ?? item.type}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
