import { useMemo } from 'react';

import ChipGroup from './ChipGroup.jsx';
import MultiSelect from './MultiSelect.jsx';
import RangeSlider from './RangeSlider.jsx';
import Toggle from './Toggle.jsx';
import { formatRupeesCompact } from '../../lib/format.js';

/** One titled block inside the panel, separated by a hairline. */
function Section({ title, hint, children }) {
  return (
    <section className="border-t border-rule-soft py-5 first:border-t-0 first:pt-0">
      <h3 className="eyebrow mb-3 flex items-baseline justify-between gap-2">
        <span>{title}</span>
        {hint && <span className="normal-case tracking-normal text-ink-faint">{hint}</span>}
      </h3>
      {children}
    </section>
  );
}

/**
 * The filter panel. Identical content on desktop (sidebar) and mobile (bottom
 * sheet) so there is exactly one place where a filter is defined.
 */
export default function FilterPanel({ filters, actions, meta, facets }) {
  const { setScalar, setScalars, toggleList, setList } = actions;

  const courseOptions = useMemo(() => {
    const counts = new Map((facets?.course ?? []).map((item) => [item.value, item.count]));
    return (meta?.courses ?? []).map((course) => ({
      value: course.slug,
      label: course.name,
      count: counts.get(course.slug) ?? 0,
    }));
  }, [meta, facets]);

  const streamOptions = useMemo(
    () => (facets?.stream ?? []).map((item) => ({ value: item.value, label: item.value, count: item.count })),
    [facets],
  );

  const ownershipOptions = useMemo(
    () =>
      (facets?.ownership ?? []).map((item) => ({
        value: item.value,
        label: item.value,
        count: item.count,
      })),
    [facets],
  );

  const ratingOptions = useMemo(
    () =>
      (facets?.rating ?? []).map((item) => ({
        value: String(item.value),
        label: `${item.value}+`,
        count: item.count,
      })),
    [facets],
  );

  const examOptions = useMemo(() => {
    const counts = new Map((facets?.exam ?? []).map((item) => [item.value, item.count]));
    return (meta?.exams ?? []).map((exam) => ({
      value: exam.slug,
      label: exam.name,
      count: counts.get(exam.slug) ?? 0,
    }));
  }, [meta, facets]);

  const cityOptions = useMemo(
    () =>
      (facets?.city ?? []).map((item) => ({
        value: item.value,
        label: item.label,
        count: item.count,
        grouped: item.grouped,
      })),
    [facets],
  );

  const stateOptions = useMemo(
    () => (facets?.state ?? []).map((item) => ({ value: item.value, label: item.value, count: item.count })),
    [facets],
  );

  const ranges = facets?.ranges;
  const established = ranges?.established;

  return (
    <div>
      <Section title="Course">
        <ChipGroup
          options={courseOptions}
          selected={filters.course}
          onToggle={(value) => toggleList('course', value)}
        />
      </Section>

      <Section title="Stream">
        <ChipGroup
          options={streamOptions}
          selected={filters.stream}
          onToggle={(value) => toggleList('stream', value)}
        />
      </Section>

      <Section title="City">
        <MultiSelect
          options={cityOptions}
          selected={filters.city}
          onToggle={(value) => toggleList('city', value)}
          onClear={() => setList('city', [])}
          placeholder="Search cities…"
        />
      </Section>

      <Section title="State">
        <MultiSelect
          options={stateOptions}
          selected={filters.state}
          onToggle={(value) => toggleList('state', value)}
          onClear={() => setList('state', [])}
          placeholder="Search states…"
        />
      </Section>

      <Section title="Fees" hint="total course fees">
        <RangeSlider
          mode="range"
          label="Total fees"
          unitLabel="rupees"
          min={ranges?.fees.min ?? 0}
          max={ranges?.fees.max ?? 1000000}
          step={10000}
          low={filters.minFees ? Number(filters.minFees) : null}
          high={filters.maxFees ? Number(filters.maxFees) : null}
          format={formatRupeesCompact}
          onChange={([low, high]) => setScalars({ minFees: low, maxFees: high })}
        />
      </Section>

      <Section title="Rating" hint="out of 10">
        <ChipGroup
          options={ratingOptions}
          selected={filters.minRating ? [String(filters.minRating)] : []}
          onToggle={(value) =>
            setScalar('minRating', filters.minRating === value ? null : value)
          }
        />
        <div className="mt-4">
          <Toggle
            label="Placements verified"
            checked={filters.placementVerified === 'true'}
            count={facets?.placementVerified}
            onChange={(checked) => setScalar('placementVerified', checked ? 'true' : null)}
          />
        </div>
      </Section>

      <Section title="Packages" hint="LPA">
        <div className="space-y-6">
          <RangeSlider
            mode="min"
            label="Highest package"
            unitLabel="LPA"
            min={0}
            max={Math.min(200, Math.ceil(((ranges?.highestPackage.max ?? 120) + 10) / 10) * 10)}
            step={5}
            low={filters.minHighestPackage ? Number(filters.minHighestPackage) : null}
            format={(value) => `${value} LPA`}
            onChange={(value) => setScalar('minHighestPackage', value)}
          />
          <RangeSlider
            mode="min"
            label="Average package"
            unitLabel="LPA"
            min={0}
            max={Math.min(100, Math.ceil(((ranges?.avgPackage.max ?? 40) + 5) / 5) * 5)}
            step={2}
            low={filters.minPackage ? Number(filters.minPackage) : null}
            format={(value) => `${value} LPA`}
            onChange={(value) => setScalar('minPackage', value)}
          />
        </div>
      </Section>

      <Section title="Ownership">
        <ChipGroup
          options={ownershipOptions}
          selected={filters.ownership}
          onToggle={(value) => toggleList('ownership', value)}
        />
      </Section>

      <Section title="Entrance exam">
        <MultiSelect
          options={examOptions}
          selected={filters.exam}
          onToggle={(value) => toggleList('exam', value)}
          onClear={() => setList('exam', [])}
          placeholder="Search exams…"
        />
      </Section>

      {established && (
        <Section title="Established">
          <RangeSlider
            mode="range"
            label="Year"
            min={established.min ?? 1900}
            max={established.max ?? new Date().getFullYear()}
            step={1}
            low={filters.establishedMin ? Number(filters.establishedMin) : null}
            high={filters.establishedMax ? Number(filters.establishedMax) : null}
            format={(value) => String(value)}
            onChange={([low, high]) =>
              setScalars({ establishedMin: low, establishedMax: high })
            }
          />
        </Section>
      )}
    </div>
  );
}
