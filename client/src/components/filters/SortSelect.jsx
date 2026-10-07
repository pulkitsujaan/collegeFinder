const SORTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Rating' },
  { value: 'highest_package', label: 'Highest package' },
  { value: 'avg_package', label: 'Average package' },
  { value: 'fees_asc', label: 'Fees: low to high' },
  { value: 'fees_desc', label: 'Fees: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

export default function SortSelect({ value, onChange, id = 'sort' }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
        Sort
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border border-rule bg-transparent py-1.5 pr-7 pl-2.5 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink focus:outline-none"
      >
        {SORTS.map((sort) => (
          <option key={sort.value} value={sort.value}>
            {sort.label}
          </option>
        ))}
      </select>
    </div>
  );
}
