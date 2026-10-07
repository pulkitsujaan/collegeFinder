import { useMemo } from 'react';

import { formatRupeesCompact } from '../../lib/format.js';

/**
 * The active filters, as removable pills above the results. They are the only
 * always-visible record of what is narrowing the list, which matters most on
 * mobile where the panel itself is closed.
 */
export default function ActivePills({ filters, actions, meta }) {
  const { setScalar, setScalars, toggleList, clearAll } = actions;

  const courseNames = useMemo(
    () => new Map((meta?.courses ?? []).map((course) => [course.slug, course.name])),
    [meta],
  );
  const examNames = useMemo(
    () => new Map((meta?.exams ?? []).map((exam) => [exam.slug, exam.name])),
    [meta],
  );

  const pills = [];

  if (filters.q) {
    pills.push({
      key: 'q',
      label: `“${filters.q}”`,
      clear: () => setScalar('q', null),
    });
  }

  for (const slug of filters.course) {
    pills.push({
      key: `course-${slug}`,
      label: courseNames.get(slug) ?? slug,
      clear: () => toggleList('course', slug),
    });
  }

  for (const stream of filters.stream) {
    pills.push({ key: `stream-${stream}`, label: stream, clear: () => toggleList('stream', stream) });
  }

  for (const city of filters.city) {
    pills.push({ key: `city-${city}`, label: city, clear: () => toggleList('city', city) });
  }

  for (const state of filters.state) {
    pills.push({ key: `state-${state}`, label: state, clear: () => toggleList('state', state) });
  }

  for (const ownership of filters.ownership) {
    pills.push({
      key: `ownership-${ownership}`,
      label: ownership,
      clear: () => toggleList('ownership', ownership),
    });
  }

  for (const slug of filters.exam) {
    pills.push({
      key: `exam-${slug}`,
      label: examNames.get(slug) ?? slug,
      clear: () => toggleList('exam', slug),
    });
  }

  if (filters.minRating) {
    pills.push({
      key: 'minRating',
      label: `Rating ${filters.minRating}+`,
      clear: () => setScalar('minRating', null),
    });
  }

  if (filters.minFees) {
    pills.push({
      key: 'minFees',
      label: `Fees from ${formatRupeesCompact(Number(filters.minFees))}`,
      clear: () => setScalar('minFees', null),
    });
  }

  if (filters.maxFees) {
    pills.push({
      key: 'maxFees',
      label: `Fees under ${formatRupeesCompact(Number(filters.maxFees))}`,
      clear: () => setScalar('maxFees', null),
    });
  }

  if (filters.minHighestPackage) {
    pills.push({
      key: 'minHighestPackage',
      label: `Highest ${filters.minHighestPackage} LPA+`,
      clear: () => setScalar('minHighestPackage', null),
    });
  }

  if (filters.minPackage) {
    pills.push({
      key: 'minPackage',
      label: `Average ${filters.minPackage} LPA+`,
      clear: () => setScalar('minPackage', null),
    });
  }

  if (filters.placementVerified === 'true') {
    pills.push({
      key: 'placementVerified',
      label: 'Placements verified',
      clear: () => setScalar('placementVerified', null),
    });
  }

  if (filters.establishedMin || filters.establishedMax) {
    const from = filters.establishedMin ?? '…';
    const to = filters.establishedMax ?? 'now';
    pills.push({
      key: 'established',
      label: `Established ${from}–${to}`,
      clear: () => setScalars({ establishedMin: null, establishedMax: null }),
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
        Filtered by
      </span>

      {pills.map((pill) => (
        <button
          key={pill.key}
          type="button"
          onClick={pill.clear}
          className="group inline-flex items-center gap-2 border border-rule bg-paper-2/60 px-2.5 py-1.5 font-mono text-[0.64rem] uppercase tracking-[0.08em] text-ink transition-colors hover:border-vermilion hover:text-vermilion"
        >
          {pill.label}
          <span aria-hidden="true" className="text-ink-faint transition-colors group-hover:text-vermilion">
            ×
          </span>
          <span className="sr-only">Remove this filter</span>
        </button>
      ))}

      <button
        type="button"
        onClick={clearAll}
        className="ml-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-soft underline underline-offset-4 transition-colors hover:text-vermilion"
      >
        Clear all
      </button>
    </div>
  );
}
