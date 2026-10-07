import { formatPackageShort } from '../../lib/format.js';

/**
 * Highest vs average package as two bars on a shared scale. Reading the gap is
 * the whole point — a college whose average sits close to its highest is a
 * steadier bet than one carried by a single outlier.
 */
export default function PackageBar({ highest, average, compact = false }) {
  if (highest == null && average == null) return null;
  const scale = Math.max(highest ?? 0, average ?? 0) || 1;

  const rows = [
    { key: 'highest', label: 'Highest', value: highest, className: 'bg-vermilion' },
    { key: 'average', label: 'Average', value: average, className: 'bg-forest' },
  ];

  return (
    <dl className={compact ? 'space-y-3' : 'space-y-4'}>
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft">
            {row.label}
          </dt>
          <dd className="h-2 w-full bg-paper-2" aria-hidden="true">
            <span
              className={`block h-full ${row.className}`}
              style={{ width: `${Math.max(2, ((row.value ?? 0) / scale) * 100)}%` }}
            />
          </dd>
          <dd className="w-20 text-right font-mono text-[0.72rem] tabular-nums text-ink">
            {formatPackageShort(row.value)}
          </dd>
        </div>
      ))}
      <p className="sr-only">
        Highest package {formatPackageShort(highest)}, average package {formatPackageShort(average)}.
      </p>
    </dl>
  );
}
