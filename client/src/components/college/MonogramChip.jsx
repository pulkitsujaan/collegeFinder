import { coverPalette, monogram } from '../../lib/cover.js';

/** The small monogram tile used in the compare tray, the shortlist and tables. */
export default function MonogramChip({ college, size = 'md', className = '' }) {
  const palette = coverPalette(college.brandHue ?? 20);
  const sizes = {
    sm: 'h-8 w-8 text-[0.6rem]',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-xl',
  };

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border font-display tracking-[-0.02em] ${
        sizes[size] ?? sizes.md
      } ${className}`}
      style={{
        backgroundColor: palette.deep,
        borderColor: palette.accent,
        color: palette.sky,
      }}
    >
      {monogram(college.name, college.shortName)}
    </span>
  );
}
