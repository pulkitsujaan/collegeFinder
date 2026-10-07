import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import SentenceBuilder from '../components/college/SentenceBuilder.jsx';
import CityPostcard from '../components/college/CityPostcard.jsx';
import CollegeCard from '../components/college/CollegeCard.jsx';
import ScrollStrip from '../components/layout/ScrollStrip.jsx';
import SectionHeading from '../components/ui/SectionHeading.jsx';
import SampleDataNote from '../components/ui/SampleDataNote.jsx';
import Button from '../components/ui/Button.jsx';
import { CardSkeletonGrid, Skeleton } from '../components/ui/Skeleton.jsx';
import { useColleges, useExams, useMeta } from '../api/hooks.js';
import { daysUntil, formatDate, formatNumber, relativeDay } from '../lib/format.js';
import useCountUp from '../lib/useCountUp.js';
import useDocumentTitle from '../lib/useDocumentTitle.js';

const SWAP_MS = 2400;

/** The headline word that cycles through courses. */
function SwappingWord({ words }) {
  const [index, setIndex] = useState(0);
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced || words.length < 2) return undefined;
    const timer = setInterval(() => setIndex((value) => (value + 1) % words.length), SWAP_MS);
    return () => clearInterval(timer);
  }, [reduced, words.length]);

  if (!words.length) return null;

  return (
    <span className="relative inline-block text-vermilion">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          className="inline-block whitespace-nowrap"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
      <span aria-hidden="true" className="invisible">
        {words.reduce((longest, word) => (word.length > longest.length ? word : longest), '')}
      </span>
    </span>
  );
}

/** One counter in the forest stats band. */
function Stat({ value, label, index }) {
  const [ref, current] = useCountUp(value ?? 0);

  return (
    <div ref={ref} className="rule-t border-paper/25 pt-5">
      <p className="font-display text-numeral tabular-nums text-paper">{formatNumber(current)}</p>
      <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-paper/60">
        <span className="mr-2 text-marigold">{String(index).padStart(2, '0')}</span>
        {label}
      </p>
    </div>
  );
}

export default function Home() {
  const meta = useMeta();
  const topRated = useColleges({ sort: 'rating', pageSize: 6 });
  const exams = useExams({});

  useDocumentTitle('CollegeDost — find the college that fits');

  const streamWords = useMemo(
    () => (meta.data?.streams ?? []).slice(0, 6).map((stream) => stream.stream),
    [meta.data],
  );

  const featuredCities = useMemo(() => (meta.data?.cities ?? []).slice(0, 10), [meta.data]);

  const streams = useMemo(
    () => (meta.data?.streams ?? []).filter((stream) => stream.count > 0),
    [meta.data],
  );

  const upcoming = useMemo(() => {
    const items = exams.data?.items ?? [];
    return items
      .filter((exam) => {
        const days = daysUntil(exam.examDate);
        return days != null && days >= 0;
      })
      .slice(0, 6);
  }, [exams.data]);

  const totals = meta.data?.totals;

  return (
    <>
      {/* Hero */}
      <section className="shell pt-14 pb-16 md:pt-20 md:pb-24">
        <p className="eyebrow mb-8">Sample data · prototype · 2026 cycle</p>

        <h1 className="max-w-5xl font-display text-display-xl">
          Find your
          <br />
          {streamWords.length > 0 ? <SwappingWord words={streamWords} /> : 'course'}.
        </h1>

        <p className="mt-8 max-w-prose text-[1.05rem] leading-[1.7] text-ink-soft">
          Real colleges, real cities, and the numbers that actually decide things — fees,
          packages, cutoffs. Start with a sentence, end with a shortlist.
        </p>

        <div className="mt-14">
          <SentenceBuilder meta={meta.data} />
        </div>
      </section>

      {/* City postcards */}
      <section className="shell py-16 md:py-20">
        <SectionHeading
          index="01"
          eyebrow="Where"
          title="Cities students actually move to"
          description="Each card carries the number of colleges we list there. Drag the strip, or use the arrows."
          action={<Button variant="quiet" size="sm" to="/colleges">All cities</Button>}
        />

        <div className="mt-10">
          {meta.isLoading ? (
            <div className="flex gap-5 overflow-hidden">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-64 w-64 shrink-0" />
              ))}
            </div>
          ) : (
            <ScrollStrip label="Featured cities">
              {featuredCities.map((city) => (
                <li key={city.value} className="shrink-0">
                  <CityPostcard city={city} />
                </li>
              ))}
            </ScrollStrip>
          )}
        </div>
      </section>

      {/* Stream browser */}
      <section className="shell py-16 md:py-20">
        <SectionHeading
          index="02"
          eyebrow="What"
          title="Browse by stream"
          description="Sixteen streams, from engineering to veterinary science. Pick one to see the courses underneath it."
        />

        <ul className="mt-10 grid gap-px border border-rule-soft bg-rule-soft sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((stream, index) => (
            <li key={stream.stream} className="bg-paper">
              <Link
                to={`/colleges?stream=${encodeURIComponent(stream.stream)}`}
                className="group flex h-full items-baseline justify-between gap-4 p-6 transition-colors hover:bg-paper-2"
              >
                <span>
                  <span className="block font-mono text-[0.56rem] uppercase tracking-[0.14em] text-ink-faint">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-2 block font-display text-[1.35rem] leading-tight tracking-[-0.02em] group-hover:text-vermilion">
                    {stream.stream}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[0.68rem] tabular-nums text-ink-soft">
                  {formatNumber(stream.count)}
                </span>
              </Link>
            </li>
          ))}
          {meta.isLoading &&
            Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="bg-paper p-6">
                <Skeleton className="h-16 w-full" />
              </li>
            ))}
        </ul>
      </section>

      {/* Top rated */}
      <section className="shell py-16 md:py-20">
        <SectionHeading
          index="03"
          eyebrow="Well reviewed"
          title="The highest-rated colleges we list"
          description="Ranked by student rating across every stream and city in the catalogue."
          action={<Button variant="quiet" size="sm" to="/colleges?sort=rating">See the full list</Button>}
        />

        <div className="mt-10">
          {topRated.isLoading ? (
            <CardSkeletonGrid count={3} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(topRated.data?.items ?? []).slice(0, 6).map((college) => (
                <CollegeCard key={college.slug} college={college} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats band */}
      <section className="theme-forest bg-forest text-paper">
        <div className="shell py-20 md:py-28">
          <h2 className="max-w-3xl font-display text-display-lg text-paper">
            What is in the catalogue right now.
          </h2>
          <p className="mt-5 max-w-prose text-[0.95rem] leading-relaxed text-paper/70">
            Every number below comes from our own sample dataset. Nothing here has been bought,
            sponsored or scraped from someone else&rsquo;s list.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat index={1} value={totals?.colleges} label="Colleges listed" />
            <Stat index={2} value={totals?.courses} label="Courses mapped" />
            <Stat index={3} value={totals?.cities} label="Cities covered" />
            <Stat index={4} value={totals?.exams} label="Entrance exams" />
          </div>

          <p className="mt-12 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-paper/50">
            Sample data for prototype. Verify details on the official college website.
          </p>
        </div>
      </section>

      {/* Exams strip */}
      <section className="shell py-16 md:py-20">
        <SectionHeading
          index="04"
          eyebrow="Coming up"
          title="Exams with a date in the diary"
          description="Application windows and exam days for the current cycle."
          action={<Button variant="quiet" size="sm" to="/exams">Every exam</Button>}
        />

        <div className="mt-10">
          {exams.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No upcoming exam dates in the sample data. See the full calendar for the whole cycle.
            </p>
          ) : (
            <ScrollStrip label="Upcoming exams">
              {upcoming.map((exam) => (
                <li
                  key={exam.slug}
                  className="w-[20rem] shrink-0 snap-start border border-rule-soft p-5"
                >
                  <p className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-ink-soft">
                    {exam.stream}
                  </p>
                  <h3 className="mt-2 font-display text-xl leading-tight tracking-[-0.02em]">
                    <Link to={`/exams/${exam.slug}`} className="link-underline">
                      {exam.name}
                    </Link>
                  </h3>
                  <p className="mt-3 font-mono text-[0.72rem] tabular-nums text-ink">
                    {formatDate(exam.examDate)}
                  </p>
                  <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-vermilion">
                    {relativeDay(exam.examDate)}
                  </p>
                  <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-faint">
                    Applications from {formatDate(exam.applicationStart)}
                  </p>
                </li>
              ))}
            </ScrollStrip>
          )}
        </div>

        <div className="mt-14 rule-t pt-5">
          <SampleDataNote />
        </div>
      </section>
    </>
  );
}
