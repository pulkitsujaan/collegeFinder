import { Link, useSearchParams } from 'react-router-dom';

import MonogramChip from '../components/college/MonogramChip.jsx';
import RatingBadge from '../components/ui/RatingBadge.jsx';
import ChipGroup from '../components/filters/ChipGroup.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import SampleDataNote from '../components/ui/SampleDataNote.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useRankingCourses, useRankings } from '../api/hooks.js';
import { formatPackage, formatRupeesCompact } from '../lib/format.js';
import useDocumentTitle from '../lib/useDocumentTitle.js';

const DEFAULT_COURSE = 'btech';

export default function Rankings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const course = searchParams.get('course') || DEFAULT_COURSE;

  const courses = useRankingCourses();
  const rankings = useRankings(course);

  useDocumentTitle(`Top ${course.toUpperCase()} colleges`);

  const courseName = courses.data?.items?.find((item) => item.slug === course)?.name ?? course.toUpperCase();

  const selectCourse = (value) => setSearchParams({ course: value }, { replace: true });

  return (
    <div className="pb-20">
      <header className="border-b border-rule">
        <div className="shell py-10 md:py-14">
          <p className="eyebrow mb-4">Student-choice ranking</p>
          <h1 className="max-w-4xl font-display text-display-lg">
            Top {courseName} colleges, ranked.
          </h1>
          <p className="mt-5 max-w-prose text-[0.95rem] leading-relaxed text-ink-soft">
            Built from the rating and the placement figures in our sample data — not from any
            external survey. The formula is printed below so you can argue with it.
          </p>

          {rankings.data?.formula && (
            <p className="mt-6 max-w-3xl border-l-2 border-rule pl-4 font-mono text-[0.66rem] leading-relaxed tracking-[0.02em] text-ink-soft">
              {rankings.data.formula}
            </p>
          )}
        </div>
      </header>

      <div className="shell mt-8">
        {courses.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="eyebrow">Course</span>
            <div className="min-w-0 flex-1">
              <ChipGroup
                options={(courses.data?.items ?? []).map((item) => ({
                  value: item.slug,
                  label: item.name,
                  count: item.count,
                }))}
                selected={[course]}
                onToggle={selectCourse}
              />
            </div>
          </div>
        )}
      </div>

      <div className="shell mt-12">
        {rankings.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : rankings.isError ? (
          <EmptyState
            title="The ranking did not load"
            body={rankings.error?.message ?? 'Something went wrong talking to the server.'}
            actionLabel="Try again"
            onAction={() => rankings.refetch()}
          />
        ) : (rankings.data?.items ?? []).length === 0 ? (
          <EmptyState
            title={`No colleges teach ${courseName} in the sample data`}
            body="Pick another course above."
            actionLabel="Browse all colleges"
            actionTo="/colleges"
          />
        ) : (
          <ol className="border-t border-ink">
            {rankings.data.items.map((college, index) => (
              <li
                key={college.slug}
                className="grid grid-cols-[3.5rem_1fr] items-center gap-x-5 gap-y-4 border-b border-rule-soft py-5 sm:grid-cols-[3.5rem_1fr_auto] sm:gap-x-8"
              >
                <span
                  className={`font-display text-4xl tabular-nums tracking-[-0.03em] ${
                    index < 3 ? 'text-vermilion' : 'text-ink-faint'
                  }`}
                  aria-label={`Rank ${index + 1}`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="flex min-w-0 items-start gap-4">
                  <MonogramChip college={college} />
                  <div className="min-w-0">
                    <h2 className="font-display text-xl leading-tight tracking-[-0.02em]">
                      <Link to={`/college/${college.slug}`} className="link-underline">
                        {college.name}
                      </Link>
                    </h2>
                    <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-faint">
                      {college.city}, {college.state} · {college.ownership}
                      {college.placementVerified ? ' · placements verified' : ''}
                    </p>
                  </div>
                </div>

                <dl className="col-start-2 grid grid-cols-4 gap-x-6 gap-y-3 sm:col-start-3 sm:gap-x-8">
                  <div>
                    <dt className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-ink-faint">
                      Score
                    </dt>
                    <dd className="mt-1 font-mono text-[0.8rem] tabular-nums text-ink">
                      {college.score.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-ink-faint">
                      Rating
                    </dt>
                    <dd className="mt-1">
                      <RatingBadge rating={college.rating} />
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-ink-faint">
                      Highest
                    </dt>
                    <dd className="mt-1 font-mono text-[0.8rem] tabular-nums text-ink">
                      {formatPackage(college.highestPackageLpa)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-ink-faint">
                      Fees from
                    </dt>
                    <dd className="mt-1 font-mono text-[0.8rem] tabular-nums text-ink">
                      {formatRupeesCompact(college.minFeesInr)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-12 rule-t pt-5">
          <SampleDataNote />
        </div>
      </div>
    </div>
  );
}
