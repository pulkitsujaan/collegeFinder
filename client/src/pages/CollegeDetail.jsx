import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import CollegeCover from '../components/college/CollegeCover.jsx';
import PackageBar from '../components/college/PackageBar.jsx';
import MonogramChip from '../components/college/MonogramChip.jsx';
import Button from '../components/ui/Button.jsx';
import RatingBadge from '../components/ui/RatingBadge.jsx';
import SampleDataNote from '../components/ui/SampleDataNote.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useCollege } from '../api/hooks.js';
import { useShortlist } from '../lib/ShortlistContext.jsx';
import { useCompare } from '../lib/CompareContext.jsx';
import { formatDate, formatDuration, formatNumber, formatPackage, formatRupees } from '../lib/format.js';
import useDocumentTitle from '../lib/useDocumentTitle.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'courses', label: 'Courses & Fees' },
  { id: 'placements', label: 'Placements' },
  { id: 'exams', label: 'Exams' },
  { id: 'facilities', label: 'Facilities' },
];

/**
 * Location without a map API. A plain lat/long graticule with a pin — no
 * hand-drawn outline, because a simplified border would be a claim we have no
 * business making.
 */
function LocationPlot({ latitude, longitude, city, state }) {
  if (latitude == null || longitude == null) return null;

  // India's bounding box, roughly.
  const x = ((longitude - 68) / (97 - 68)) * 100;
  const y = ((37 - latitude) / (37 - 6)) * 100;

  return (
    <div className="relative border border-rule-soft bg-paper-2/50 p-5">
      <svg viewBox="0 0 100 100" className="h-44 w-full text-rule" role="img" aria-label={`Approximate location: ${city}, ${state}`}>
        <g stroke="currentColor" strokeWidth="0.4">
          {[20, 40, 60, 80].map((line) => (
            <line key={`h${line}`} x1="0" y1={line} x2="100" y2={line} />
          ))}
          {[20, 40, 60, 80].map((line) => (
            <line key={`v${line}`} x1={line} y1="0" x2={line} y2="100" />
          ))}
        </g>
        <g fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5">
          <rect x="0.5" y="0.5" width="99" height="99" />
        </g>
        <line x1={x} y1="0" x2={x} y2="100" stroke="#E4572E" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="0" y1={y} x2="100" y2={y} stroke="#E4572E" strokeWidth="0.5" strokeDasharray="2 2" />
        <circle cx={x} cy={y} r="2.5" fill="#E4572E" />
        <circle cx={x} cy={y} r="6" fill="none" stroke="#E4572E" strokeWidth="0.6" />
      </svg>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-soft">
        <div>
          <dt className="text-ink-faint">Latitude</dt>
          <dd className="tabular-nums text-ink">{latitude.toFixed(4)}° N</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Longitude</dt>
          <dd className="tabular-nums text-ink">{longitude.toFixed(4)}° E</dd>
        </div>
      </dl>
      <p className="mt-3 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-faint">
        Approximate coordinates — not a survey
      </p>
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="rule-t pt-3">
      <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className="mt-1.5 text-[0.92rem] text-ink">{children ?? '—'}</dd>
    </div>
  );
}

export default function CollegeDetail() {
  const { slug } = useParams();
  const { data: college, isLoading, isError, error, refetch } = useCollege(slug);
  const [activeTab, setActiveTab] = useState('overview');
  const shortlist = useShortlist();
  const compare = useCompare();

  useDocumentTitle(college?.name ?? 'College');

  // Scroll spy for the section tabs / sticky bar.
  useEffect(() => {
    if (!college) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveTab(visible.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    for (const tab of TABS) {
      const element = document.getElementById(tab.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [college]);

  const topCourses = useMemo(() => college?.courses ?? [], [college]);

  if (isLoading) {
    return (
      <div className="shell py-16">
        <Skeleton className="h-[42vh] w-full" />
        <Skeleton className="mt-8 h-12 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/3" />
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !college) {
    return (
      <div className="shell py-20">
        <EmptyState
          title="We could not find that college"
          body={error?.message ?? 'The link may be out of date, or the college is not in the catalogue.'}
          actionLabel="Browse all colleges"
          actionTo="/colleges"
        />
        <div className="mt-6 text-center">
          <Button variant="bare" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const saved = shortlist.has(college.slug);
  const comparing = compare.has(college.slug);
  const verified = college.placementVerified;

  return (
    <article className="pb-16">
      {/* Cover with the name overlapping its lower edge. */}
      <div className="shell pt-6">
        <CollegeCover
          id={college.id}
          slug={college.slug}
          name={college.name}
          shortName={college.shortName}
          brandHue={college.brandHue}
          variant="hero"
          className="h-[38vh] min-h-[16rem] w-full"
        />
      </div>

      <header className="shell -mt-10 md:-mt-14">
        {/* The card still overlaps the cover, but the padding-top carries the
            eyebrow clear of the image so the name never sits on the banner. */}
        <div className="border border-rule bg-paper px-6 pt-10 pb-6 md:px-10 md:pt-16 md:pb-10">
          <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
            <div className="max-w-3xl">
              <p className="eyebrow mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{college.city}, {college.state}</span>
                {college.regionGroup && college.regionGroup !== college.city && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{college.regionGroup}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{college.ownership}</span>
              </p>

              <h1 className="font-display text-display-md">{college.name}</h1>

              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-ink-soft">
                <span>Established {college.establishedYear}</span>
                {college.accreditation && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{college.accreditation}</span>
                  </>
                )}
                {college.campusSizeAcres && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{formatNumber(college.campusSizeAcres)} acre campus</span>
                  </>
                )}
              </p>
            </div>

            <div className="shrink-0">
              <RatingBadge rating={college.rating} size="lg" />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-rule-soft pt-6">
            <Button
              variant={saved ? 'solid' : 'ink'}
              onClick={() => shortlist.toggle(college)}
              aria-pressed={saved}
            >
              {saved ? 'Shortlisted' : 'Add to shortlist'}
            </Button>
            <Button
              variant={comparing ? 'forest' : 'outline'}
              onClick={() => compare.toggle(college)}
              aria-pressed={comparing}
            >
              {comparing ? 'In compare tray' : 'Add to compare'}
            </Button>
            {college.website && (
              <Button variant="bare" href={`https://${college.website.replace(/^https?:\/\//, '')}`}>
                {college.website.replace(/^https?:\/\//, '')}
              </Button>
            )}
            <span className="ml-auto">
              <SampleDataNote variant="badge" />
            </span>
          </div>
        </div>
      </header>

      {/* Sticky section tabs */}
      <nav
        aria-label="Sections"
        className="sticky top-[var(--topbar-h)] z-30 mt-10 border-y border-rule bg-paper/95 backdrop-blur-[2px]"
      >
        <ul className="shell hide-scrollbar flex gap-6 overflow-x-auto py-3">
          {TABS.map((tab) => {
            const available = tab.id !== 'facilities' || college.facilities.length > 0;
            if (!available) return null;
            return (
              <li key={tab.id}>
                <a
                  href={`#${tab.id}`}
                  aria-current={activeTab === tab.id ? 'true' : undefined}
                  className={`link-underline whitespace-nowrap font-mono text-[0.66rem] uppercase tracking-[0.14em] transition-colors ${
                    activeTab === tab.id ? 'text-vermilion' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {tab.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shell mt-12 grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-16">
        <div className="min-w-0 space-y-16">
          <section id="overview" className="scroll-mt-32">
            <h2 className="mb-6 font-display text-display-sm">Overview</h2>
            <p className="max-w-prose text-[1.02rem] leading-[1.75] text-ink-soft">
              {college.description}
            </p>

            <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Ownership">{college.ownership}</Fact>
              <Fact label="Established">{college.establishedYear}</Fact>
              <Fact label="City">{college.city}</Fact>
              <Fact label="State">{college.state}</Fact>
              <Fact label="Accreditation">{college.accreditation ?? '—'}</Fact>
              <Fact label="Courses listed">{college.courses.length}</Fact>
              <Fact label="Entrance exams">{college.exams.length}</Fact>
              <Fact label="Placement data">
                {verified ? 'Verified' : 'Self-reported'}
              </Fact>
            </dl>
          </section>

          <section id="courses" className="scroll-mt-32">
            <h2 className="mb-6 font-display text-display-sm">Courses &amp; Fees</h2>
            <div className="overflow-x-auto" data-lenis-prevent>
              <table className="w-full min-w-[44rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink">
                    {['Course', 'Level', 'Duration', 'Total fees', 'Seats', 'Eligibility'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="py-3 pr-4 font-mono text-[0.58rem] font-normal uppercase tracking-[0.14em] text-ink-soft"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topCourses.map((course) => (
                    <tr key={course.id} className="border-b border-rule-soft align-top">
                      <th scope="row" className="py-4 pr-4 font-normal">
                        <Link to={`/colleges?course=${course.slug}`} className="link-underline text-[0.95rem]">
                          {course.name}
                        </Link>
                      </th>
                      <td className="py-4 pr-4 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-soft">
                        {course.level}
                      </td>
                      <td className="py-4 pr-4 font-mono text-[0.74rem] tabular-nums text-ink-soft">
                        {formatDuration(course.durationYears)}
                      </td>
                      <td className="py-4 pr-4 font-mono text-[0.78rem] tabular-nums text-ink">
                        {formatRupees(course.totalFeesInr)}
                        {course.cutoffNote && (
                          <span className="mt-1 block font-sans text-[0.72rem] text-ink-faint">
                            {course.cutoffNote}
                          </span>
                        )}
                      </td>
                      <td className="py-4 pr-4 font-mono text-[0.74rem] tabular-nums text-ink-soft">
                        {formatNumber(course.seats)}
                      </td>
                      <td className="py-4 pr-4 text-[0.8rem] leading-relaxed text-ink-soft">
                        {course.eligibility}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="placements" className="scroll-mt-32">
            <h2 className="mb-6 font-display text-display-sm">Placements</h2>

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="rule-t pt-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">
                  Highest package
                </p>
                <p className="mt-2 font-display text-numeral">{formatPackage(college.highestPackageLpa)}</p>
              </div>
              <div className="rule-t pt-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">
                  Average package
                </p>
                <p className="mt-2 font-display text-numeral">{formatPackage(college.avgPackageLpa)}</p>
              </div>
            </div>

            <div className="mt-10">
              <PackageBar highest={college.highestPackageLpa} average={college.avgPackageLpa} />
            </div>

            <p className="mt-8 max-w-prose border-l-2 border-marigold pl-4 text-[0.86rem] leading-relaxed text-ink-soft">
              {verified
                ? 'Placement figures for this college are marked as verified for the prototype.'
                : 'Placement figures for this college are self-reported and shown as sample data.'}{' '}
              Treat both as illustrative until you check the official placement report.
            </p>
          </section>

          <section id="exams" className="scroll-mt-32">
            <h2 className="mb-6 font-display text-display-sm">Exams accepted</h2>
            {college.exams.length === 0 ? (
              <p className="text-sm text-ink-soft">
                This college is listed without an entrance exam in the sample data.
              </p>
            ) : (
              <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {college.exams.map((exam) => (
                  <li key={exam.id} className="flex items-baseline justify-between gap-4 border-b border-rule-soft pb-3">
                    <Link to={`/exams?stream=${encodeURIComponent(exam.stream)}`} className="link-underline text-[0.95rem]">
                      {exam.name}
                    </Link>
                    <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-faint">
                      {exam.examDate ? formatDate(exam.examDate) : 'Date TBA'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {college.facilities.length > 0 && (
            <section id="facilities" className="scroll-mt-32">
              <h2 className="mb-6 font-display text-display-sm">Facilities</h2>
              <ul className="grid grid-cols-2 gap-x-8 sm:grid-cols-3">
                {college.facilities.map((facility) => (
                  <li
                    key={facility.slug}
                    className="border-b border-rule-soft py-3 text-[0.9rem] text-ink-soft"
                  >
                    {facility.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-10">
          <LocationPlot
            latitude={college.latitude}
            longitude={college.longitude}
            city={college.city}
            state={college.state}
          />

          <div className="border border-rule-soft bg-paper-2/50 p-5">
            <h2 className="mb-4 font-display text-display-sm">Fee range</h2>
            {college.feeRange ? (
              <>
                <p className="font-display text-3xl tracking-[-0.02em]">
                  {formatRupees(college.feeRange.min)}
                  <span className="mx-2 text-ink-faint">–</span>
                  {formatRupees(college.feeRange.max)}
                </p>
                <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-soft">
                  Across {college.courses.length} {college.courses.length === 1 ? 'course' : 'courses'} in the
                  sample data.
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-soft">No fees listed.</p>
            )}
          </div>

          <div className="rule-t pt-5">
            <SampleDataNote />
          </div>
        </aside>
      </div>

      {college.similar.length > 0 && (
        <section className="shell mt-20">
          <div className="rule-t flex flex-wrap items-end justify-between gap-4 pt-6">
            <h2 className="font-display text-display-sm">Similar colleges</h2>
            <Link to={`/colleges?city=${encodeURIComponent(college.city)}`} className="link-underline font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ink-soft">
              All in {college.city}
            </Link>
          </div>

          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {college.similar.map((similar) => (
              <li key={similar.slug}>
                <Link
                  to={`/college/${similar.slug}`}
                  className="group flex h-full items-start gap-4 border border-rule-soft p-4 transition-colors hover:border-ink/40"
                >
                  <MonogramChip college={similar} />
                  <span className="min-w-0">
                    <span className="block font-display text-[1.05rem] leading-tight tracking-[-0.02em] group-hover:text-vermilion">
                      {similar.name}
                    </span>
                    <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-faint">
                      {similar.city} · {similar.ownership}
                    </span>
                    <span className="mt-2 block">
                      <RatingBadge rating={similar.rating} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
