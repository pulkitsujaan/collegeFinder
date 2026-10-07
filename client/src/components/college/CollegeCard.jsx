import { Link } from 'react-router-dom';

import CollegeCover from './CollegeCover.jsx';
import RatingBadge from '../ui/RatingBadge.jsx';
import { formatRupeesCompact } from '../../lib/format.js';
import { useShortlist } from '../../lib/ShortlistContext.jsx';
import { useCompare } from '../../lib/CompareContext.jsx';

/**
 * The listing card: cover, identity, the three numbers a student actually
 * compares, and the two actions. The whole card is not a link — the title is —
 * so the buttons inside stay clickable and the tab order stays sane.
 */
export default function CollegeCard({ college }) {
  const shortlist = useShortlist();
  const compare = useCompare();

  const saved = shortlist.has(college.slug);
  const comparing = compare.has(college.slug);

  return (
    <article className="group flex flex-col border border-rule-soft bg-paper transition-colors duration-200 ease-editorial hover:border-ink/40">
      <Link
        to={`/college/${college.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        tabIndex={-1}
        aria-hidden="true"
      >
        <CollegeCover
          slug={college.slug}
          name={college.name}
          shortName={college.shortName}
          brandHue={college.brandHue}
          className="h-40 w-full transition-transform duration-500 ease-editorial group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft">
          <span>{college.city}</span>
          <span aria-hidden="true">·</span>
          <span>{college.ownership}</span>
          {college.placementVerified && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-forest">Placements verified</span>
            </>
          )}
        </p>

        <h3 className="font-display text-xl leading-[1.15] tracking-[-0.02em]">
          <Link to={`/college/${college.slug}`} className="link-underline">
            {college.name}
          </Link>
        </h3>

        {college.courseNames?.length > 0 && (
          <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-soft">
            {college.courseNames.join(' · ')}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-rule-soft pt-4">
          <div>
            <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">
              Rating
            </dt>
            <dd className="mt-1">
              <RatingBadge rating={college.rating} />
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">
              Fees from
            </dt>
            <dd className="mt-1 font-mono text-[0.82rem] tabular-nums">
              {formatRupeesCompact(college.minFeesInr)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">
              Highest
            </dt>
            <dd className="mt-1 font-mono text-[0.82rem] tabular-nums">
              {college.highestPackageLpa == null ? '—' : `${college.highestPackageLpa} LPA`}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => shortlist.toggle(college)}
            aria-pressed={saved}
            className={`border px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] transition-colors ${
              saved
                ? 'border-vermilion bg-vermilion text-paper'
                : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
            }`}
          >
            {saved ? 'Shortlisted' : 'Shortlist'}
          </button>
          <button
            type="button"
            onClick={() => compare.toggle(college)}
            aria-pressed={comparing}
            className={`border px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] transition-colors ${
              comparing
                ? 'border-forest bg-forest text-paper'
                : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
            }`}
          >
            {comparing ? 'In compare' : 'Compare'}
          </button>
        </div>
      </div>
    </article>
  );
}
