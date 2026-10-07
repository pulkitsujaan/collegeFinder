import { Link, useParams } from 'react-router-dom';

import MonogramChip from '../components/college/MonogramChip.jsx';
import RatingBadge from '../components/ui/RatingBadge.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import SampleDataNote from '../components/ui/SampleDataNote.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useExam } from '../api/hooks.js';
import { daysUntil, formatDate, relativeDay } from '../lib/format.js';
import useDocumentTitle from '../lib/useDocumentTitle.js';

const STEPS = [
  { key: 'applicationStart', label: 'Applications open' },
  { key: 'examDate', label: 'Exam day' },
  { key: 'resultDate', label: 'Results' },
];

export default function ExamDetail() {
  const { slug } = useParams();
  const { data: exam, isLoading, isError, error, refetch } = useExam(slug);

  useDocumentTitle(exam?.name ?? 'Exam');

  if (isLoading) {
    return (
      <div className="shell py-16">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="mt-5 h-16 w-2/3" />
        <Skeleton className="mt-10 h-40 w-full" />
      </div>
    );
  }

  if (isError || !exam) {
    return (
      <div className="shell py-20">
        <EmptyState
          title="We could not find that exam"
          body={error?.message ?? 'It may not be in the catalogue.'}
          actionLabel="See every exam"
          actionTo="/exams"
        />
        <div className="mt-6 text-center">
          <Button variant="bare" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className="pb-20">
      <header className="border-b border-rule">
        <div className="shell py-10 md:py-14">
          <Link
            to="/exams"
            className="link-underline font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft"
          >
            All exams
          </Link>

          <p className="eyebrow mt-6 mb-3 flex flex-wrap items-center gap-x-3">
            <span>{exam.stream}</span>
            <span aria-hidden="true">·</span>
            <span>{exam.level}</span>
            <span aria-hidden="true">·</span>
            <span>{exam.mode}</span>
          </p>

          <h1 className="font-display text-display-md">{exam.fullName ?? exam.name}</h1>
          <p className="mt-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-soft">
            {exam.name}
          </p>

          <p className="mt-6 max-w-prose text-[1.02rem] leading-[1.75] text-ink-soft">
            {exam.description}
          </p>
        </div>
      </header>

      <section className="shell mt-12">
        <h2 className="eyebrow mb-6">The cycle</h2>

        <ol className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => {
            const iso = exam[step.key];
            const days = daysUntil(iso);
            const passed = days != null && days < 0;

            return (
              <li key={step.key} className="rule-t pt-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">
                  {step.label}
                </p>
                <p className={`mt-2 font-display text-2xl tracking-[-0.02em] ${passed ? 'text-ink-faint' : ''}`}>
                  {formatDate(iso)}
                </p>
                <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-soft">
                  {relativeDay(iso)}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="shell mt-16">
        <div className="rule-t flex flex-wrap items-end justify-between gap-4 pt-6">
          <h2 className="font-display text-display-sm">
            {exam.collegeCount} {exam.collegeCount === 1 ? 'college' : 'colleges'} accept {exam.name}
          </h2>
          <Button variant="outline" size="sm" to={`/colleges?exam=${exam.slug}`}>
            Filter the catalogue
          </Button>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exam.colleges.map((college) => (
            <li key={college.slug}>
              <Link
                to={`/college/${college.slug}`}
                className="group flex h-full items-start gap-4 border border-rule-soft p-4 transition-colors hover:border-ink/40"
              >
                <MonogramChip college={college} />
                <span className="min-w-0">
                  <span className="block font-display text-[1.05rem] leading-tight tracking-[-0.02em] group-hover:text-vermilion">
                    {college.name}
                  </span>
                  <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-faint">
                    {college.city} · {college.ownership}
                  </span>
                  <span className="mt-2 block">
                    <RatingBadge rating={college.rating} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {exam.collegeCount > exam.colleges.length && (
          <p className="mt-6 font-mono text-[0.64rem] uppercase tracking-[0.12em] text-ink-soft">
            Showing the top {exam.colleges.length} by rating.
          </p>
        )}

        <div className="mt-12 rule-t pt-5">
          <SampleDataNote />
        </div>
      </section>
    </article>
  );
}
