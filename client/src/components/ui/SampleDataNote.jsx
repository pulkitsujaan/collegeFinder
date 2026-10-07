/**
 * The honesty note. Every number on this site that we could not verify against
 * an official source is sample data, and the UI says so wherever a number is
 * doing persuasive work.
 */
export default function SampleDataNote({ variant = 'inline', className = '' }) {
  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 border border-marigold-dark/50 bg-marigold/10 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft ${className}`}
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-marigold-dark" />
        Sample data
      </span>
    );
  }

  return (
    <p className={`font-mono text-[0.68rem] leading-relaxed text-ink-soft ${className}`}>
      Sample data for prototype. Fees, packages, ratings and cutoffs are illustrative —
      verify details on the official college website.
    </p>
  );
}
