import { useState } from 'react';

import CollegeCard from '../components/college/CollegeCard.jsx';
import FilterPanel from '../components/filters/FilterPanel.jsx';
import MobileFilterSheet from '../components/filters/MobileFilterSheet.jsx';
import ActivePills from '../components/filters/ActivePills.jsx';
import SortSelect from '../components/filters/SortSelect.jsx';
import SearchBox from '../components/filters/SearchBox.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import SampleDataNote from '../components/ui/SampleDataNote.jsx';
import { CardSkeletonGrid } from '../components/ui/Skeleton.jsx';
import { useColleges, useFacets, useMeta } from '../api/hooks.js';
import { useFilterState } from '../components/filters/useFilterState.js';
import { formatNumber } from '../lib/format.js';
import useDocumentTitle from '../lib/useDocumentTitle.js';

const PAGE_SIZE = 12;

/** A short, human sentence for the top of the results. */
function summaryLine(filters, meta, total) {
  const courseNames = new Map((meta?.courses ?? []).map((course) => [course.slug, course.name]));
  const parts = [];

  if (filters.course.length) {
    parts.push(filters.course.map((slug) => courseNames.get(slug) ?? slug).join(' or '));
  }
  if (filters.city.length) parts.push(`in ${filters.city.join(' or ')}`);
  else if (filters.state.length) parts.push(`in ${filters.state.join(' or ')}`);

  const where = parts.length ? ` ${parts.join(' ')}` : '';
  if (total == null) return 'Looking through the catalogue…';
  if (total === 0) return `Nothing matches${where} yet.`;
  if (total === 1) return `One college matches${where}.`;
  return `${formatNumber(total)} colleges match${where}. Let's narrow it down.`;
}

/** Numbered pagination with ellipses for long result sets. */
function pageWindow(current, last) {
  const pages = new Set([1, last, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
  const out = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push('gap');
    out.push(page);
    previous = page;
  }
  return out;
}

export default function Colleges() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const state = useFilterState();
  const { filters, activeCount, facetParams, listParams, setScalar, setPage, clearAll } = state;

  // FilterPanel, the pills and the mobile sheet all take one actions object
  // rather than a different set of props each.
  const actions = {
    setScalar,
    setScalars: state.setScalars,
    setList: state.setList,
    toggleList: state.toggleList,
    activeCount,
    clearAll,
  };

  const meta = useMeta();
  const facets = useFacets(facetParams);
  const results = useColleges(listParams);

  const total = results.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = results.data?.items ?? [];
  const isFirstLoad = results.isLoading && !results.data;

  useDocumentTitle(
    filters.q ? `${filters.q} — Colleges` : filters.course.length ? 'Colleges' : 'All colleges',
  );

  return (
    <>
      <section className="border-b border-rule">
        <div className="shell py-10 md:py-14">
          <p className="eyebrow mb-4">The catalogue</p>
          <h1 className="max-w-4xl font-display text-display-lg">{summaryLine(filters, meta.data, results.data ? total : null)}</h1>

          <div className="mt-8 max-w-2xl">
            <SearchBox
              value={filters.q ?? ''}
              onChange={(value) => setScalar('q', value)}
              placeholder="Search colleges, cities or courses"
            />
          </div>
        </div>
      </section>

      <div className="shell grid gap-10 py-10 lg:grid-cols-[17rem_1fr] lg:gap-14">
        {/* Desktop filter panel */}
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--topbar-h)+1.5rem)] max-h-[calc(100vh-var(--topbar-h)-3rem)] overflow-y-auto pr-2 pb-10" data-lenis-prevent>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="eyebrow">Filters</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-soft underline underline-offset-4 transition-colors hover:text-vermilion"
                >
                  Clear all
                </button>
              )}
            </div>
            <FilterPanel filters={filters} actions={actions} meta={meta.data} facets={facets.data} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ink-soft">
              {results.isFetching && !isFirstLoad
                ? 'Updating…'
                : `${formatNumber(total)} ${total === 1 ? 'college' : 'colleges'}`}
            </p>

            <div className="flex items-center gap-3">
              <SortSelect value={filters.sort} onChange={(value) => setScalar('sort', value)} />
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setSheetOpen(true)}
              >
                Filters{activeCount ? ` (${activeCount})` : ''}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <ActivePills filters={filters} actions={actions} meta={meta.data} />
          </div>

          <div className="mt-8">
            {results.isError ? (
              <EmptyState
                title="We could not load the colleges"
                body={results.error?.message ?? 'Something went wrong talking to the server.'}
                actionLabel="Try again"
                onAction={() => results.refetch()}
              />
            ) : isFirstLoad ? (
              <CardSkeletonGrid count={6} />
            ) : items.length === 0 ? (
              <EmptyState
                title="No colleges fit those filters"
                body="Every filter here is doing something. Loosen one — drop the fee ceiling, or widen the cities — and the list will fill back up."
                actionLabel="Clear filters"
                onAction={clearAll}
              />
            ) : (
              <div className={`grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${results.isFetching ? 'opacity-60 transition-opacity' : ''}`}>
                {items.map((college) => (
                  <CollegeCard key={college.slug} college={college} />
                ))}
              </div>
            )}
          </div>

          {lastPage > 1 && items.length > 0 && (
            <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule-soft pt-6">
              <Button
                variant="quiet"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => setPage(filters.page - 1)}
              >
                Previous
              </Button>

              <ul className="flex items-center gap-1">
                {pageWindow(filters.page, lastPage).map((entry, index) =>
                  entry === 'gap' ? (
                    <li key={`gap-${index}`} aria-hidden="true" className="px-2 text-ink-faint">
                      …
                    </li>
                  ) : (
                    <li key={entry}>
                      <button
                        type="button"
                        onClick={() => setPage(entry)}
                        aria-current={entry === filters.page ? 'page' : undefined}
                        className={`min-w-9 border px-2.5 py-1.5 font-mono text-[0.68rem] tabular-nums transition-colors ${
                          entry === filters.page
                            ? 'border-ink bg-ink text-paper'
                            : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
                        }`}
                      >
                        {entry}
                      </button>
                    </li>
                  ),
                )}
              </ul>

              <Button
                variant="quiet"
                size="sm"
                disabled={filters.page >= lastPage}
                onClick={() => setPage(filters.page + 1)}
              >
                Next
              </Button>
            </nav>
          )}

          <div className="mt-12 rule-t pt-5">
            <SampleDataNote />
          </div>
        </div>
      </div>

      <MobileFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        actions={actions}
        meta={meta.data}
        facets={facets.data}
        total={total}
        isLoading={results.isFetching}
      />
    </>
  );
}
