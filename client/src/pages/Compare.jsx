import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import MonogramChip from '../components/college/MonogramChip.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import SampleDataNote from '../components/ui/SampleDataNote.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useCompareData } from '../api/hooks.js';
import { useCompare as useCompareTray } from '../lib/CompareContext.jsx';
import { formatNumber, formatPackage, formatRating, formatRupees } from '../lib/format.js';
import useDocumentTitle from '../lib/useDocumentTitle.js';

/** Renders one comparison cell according to the row's declared type. */
function Cell({ type, value, collegeName, isBest }) {
  const content = (() => {
    switch (type) {
      case 'rating':
        return value == null ? '—' : `${formatRating(value)} / 10`;
      case 'lpa':
        return formatPackage(value);
      case 'number':
        return value == null ? '—' : formatNumber(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'feeRange':
        return value ? `${formatRupees(value.min)} – ${formatRupees(value.max)}` : '—';
      case 'list':
        return value?.length ? value.join(', ') : '—';
      default:
        return value ?? '—';
    }
  })();

  return (
    <td
      className={`px-4 py-4 align-top text-[0.88rem] leading-relaxed ${
        isBest ? 'bg-marigold/10 text-ink' : 'text-ink-soft'
      }`}
    >
      {content}
      {isBest && (
        <span className="mt-1 block font-mono text-[0.55rem] uppercase tracking-[0.14em] text-marigold-dark">
          Highest
        </span>
      )}
      <span className="sr-only">{collegeName}</span>
    </td>
  );
}

export default function Compare() {
  const tray = useCompareTray();
  const [searchParams, setSearchParams] = useSearchParams();

  // A shared link arrives as ?slugs=a,b. Hydrate the tray from it once the
  // data lands, then drop the param so the URL and the tray cannot diverge.
  const requested = searchParams.get('slugs')?.split(',').filter(Boolean) ?? [];
  const slugs = requested.length ? requested : tray.slugs;

  const { data, isLoading, isError, error } = useCompareData(slugs);

  useDocumentTitle('Compare colleges');

  useEffect(() => {
    if (!requested.length || !data?.items) return;
    tray.replaceAll(data.items.filter((item) => !item.missing));
    setSearchParams({}, { replace: true });
    // Deliberately keyed on the fetched payload only — the tray is what we write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (slugs.length === 0) {
    return (
      <div className="shell py-20">
        <h1 className="mb-8 font-display text-display-lg">Compare colleges</h1>
        <EmptyState
          title="Nothing in the tray yet"
          body="Add up to three colleges with the Compare button — on the listing page, on a college page, or straight from your shortlist — and they will line up here side by side."
          actionLabel="Find colleges"
          actionTo="/colleges"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="shell py-20">
        <h1 className="mb-8 font-display text-display-lg">Compare colleges</h1>
        <EmptyState
          title="We could not build the comparison"
          body={error?.message ?? 'Something went wrong talking to the server.'}
          actionLabel="Clear the tray"
          onAction={tray.clear}
        />
      </div>
    );
  }

  const items = (data?.items ?? []).filter((item) => !item.missing);
  const rows = data?.rows ?? [];

  // `best` marks a row where a higher number wins; find the winning column.
  const bestIndex = (row) => {
    if (row.best !== 'high' || row.values.length < 2) return -1;
    let index = -1;
    let best = -Infinity;
    row.values.forEach((value, position) => {
      const comparable = typeof value === 'number' ? value : null;
      if (comparable != null && comparable > best) {
        best = comparable;
        index = position;
      }
    });
    return index;
  };

  return (
    <div className="pb-20">
      <header className="border-b border-rule">
        <div className="shell py-10 md:py-14">
          <p className="eyebrow mb-4">Side by side</p>
          <h1 className="font-display text-display-lg">
            {items.length} {items.length === 1 ? 'college' : 'colleges'}, one page.
          </h1>
          <p className="mt-5 max-w-prose text-[0.95rem] leading-relaxed text-ink-soft">
            Fees, packages, ratings and intake in one table. The winning figure in each
            comparable row is marked — everything else is sample data worth checking at source.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button variant="quiet" size="sm" to="/colleges">
              Add another college
            </Button>
            <Button variant="bare" size="sm" onClick={tray.clear}>
              Clear the tray
            </Button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="shell mt-10">
          <Skeleton className="h-96 w-full" />
        </div>
      ) : items.length < 2 ? (
        <div className="shell mt-14">
          <EmptyState
            title="One more, and this gets interesting"
            body="A comparison needs at least two colleges. Add another from the listing or from your shortlist."
            actionLabel="Add another college"
            actionTo="/colleges"
          />
        </div>
      ) : (
        <div className="shell mt-10">
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <caption className="sr-only">
                Comparison of {items.map((item) => item.name).join(', ')}
              </caption>

              <thead>
                <tr>
                  <th scope="col" className="w-44 border-b border-ink pr-4 pb-4 align-bottom">
                    <span className="font-mono text-[0.58rem] font-normal uppercase tracking-[0.14em] text-ink-faint">
                      College
                    </span>
                  </th>
                  {items.map((college) => (
                    <th
                      key={college.slug}
                      scope="col"
                      className="border-b border-ink px-4 pb-4 align-bottom"
                    >
                      <div className="flex items-start gap-3">
                        <MonogramChip college={college} />
                        <div className="min-w-0">
                          <Link
                            to={`/college/${college.slug}`}
                            className="link-underline block font-display text-[1.05rem] leading-tight tracking-[-0.02em]"
                          >
                            {college.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => tray.remove(college.slug)}
                            className="mt-2 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-ink-faint transition-colors hover:text-vermilion"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const winner = bestIndex(row);
                  return (
                    <tr key={row.key} className="border-b border-rule-soft">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-paper py-4 pr-4 align-top font-mono text-[0.6rem] font-normal uppercase tracking-[0.12em] text-ink-soft"
                      >
                        {row.label}
                      </th>
                      {items.map((college, index) => (
                        <Cell
                          key={college.slug}
                          type={row.type}
                          value={row.values[index]}
                          collegeName={college.name}
                          isBest={index === winner}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data?.missing?.length > 0 && (
            <p className="mt-6 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-ink-soft">
              Not found: {data.missing.join(', ')}
            </p>
          )}

          <div className="mt-10 rule-t pt-5">
            <SampleDataNote />
          </div>
        </div>
      )}
    </div>
  );
}
