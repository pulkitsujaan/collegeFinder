import { formatRating } from '../../lib/format.js';

/**
 * Rating out of 10. Sits on a marigold rule rather than a star glyph — the
 * numeral is the point, and colour is never the only signal because the number
 * is always spelled out.
 */
export default function RatingBadge({ rating, size = 'md', label = 'Rating' }) {
  if (rating == null) {
    return <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-faint">Not rated</span>;
  }

  const large = size === 'lg';

  return (
    <span className="inline-flex items-baseline gap-2" title={`${label}: ${formatRating(rating)} out of 10`}>
      <span
        className={`font-display tabular-nums tracking-[-0.02em] ${
          large ? 'text-4xl' : 'text-xl'
        }`}
      >
        {formatRating(rating)}
      </span>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-soft">
        <span className="sr-only">{label} out of 10</span>
        <span aria-hidden="true">/10</span>
      </span>
    </span>
  );
}
