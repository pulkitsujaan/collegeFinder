import { Link, useSearchParams } from 'react-router-dom';

import ChipGroup from '../components/filters/ChipGroup.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import SampleDataNote from '../components/ui/SampleDataNote.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useExams, useMeta } from '../api/hooks.js';
import { daysUntil, formatDate, relativeDay } from '../lib/format.js';
import useDocumentTitle from '../lib/useDocumentTitle.js';

/** One date in an exam's timeline. */
function DateCell({ label, iso }) {
  const days = daysUntil(iso);
  const soon = days != null && days >= 0 && days <= 30;

  return (
    <div className="min-w-0">
      <p className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p className="mt-1 font-mono text-[0.78rem] tabular-nums text-ink">
        {iso ? formatDate(iso) : 'TBA'}
      </p>
      {iso && (
        <p
          className={`mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] ${
            soon ? 'text-vermilion' : 'text-ink-faint'
          }`}
        >
          {relativeDay(iso)}
        </p>
      )}
    </div>
  );
}

export default function Exams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = (searchParams.get('stream') ?? '').split(',').filter(Boolean);

  const meta = useMeta();
  const exams = useExams({ stream: selected });

  useDocumentTitle('Entrance exams');

  const setStreams = (next) => {
    const params = new URLSearchParams();
    if (next.length) params.set('stream', next.join(','));
    setSearchParams(params, { replace: true });
  };

  const toggleStream = (value) =>
    setStreams(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);

  const streamOptions = (meta.data?.examStreams ?? []).map((stream) => ({
    value: stream.stream,
    label: stream.stream,
    count: stream.count,
  }));

  const items = exams.data?.items ?? [];

  return (
    <div className="pb-20">
      <header className="border-b border-rule">
        <div className="shell py-10 md:py-14">
          <p className="eyebrow mb-4">The calendar</p>
          <h1 className="max-w-4xl font-display text-display-lg">
            {items.length && !exams.isLoading
              ? `${items.length} entrance ${items.length === 1 ? 'exam' : 'exams'} to plan around.`
              : 'Entrance exams, in order.'}
          </h1>
          <p className="mt-5 max-w-prose text-[0.95rem] leading-relaxed text-ink-soft">
            Application windows, exam days and result dates. Dates are sample data built
            around the current cycle — always confirm on the official exam website before you plan.
          </p>
        </div>
      </header>

      <div className="shell mt-8">
        {streamOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="eyebrow">Stream</span>
            <div className="min-w-0 flex-1">
              <ChipGroup
                options={[{ value: '__all__', label: 'All', count: meta.data?.totals?.exams }, ...streamOptions]}
                selected={selected}
                onToggle={(value) => (value === '__all__' ? setStreams([]) : toggleStream(value))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="shell mt-10">
        {exams.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : exams.isError ? (
          <EmptyState
            title="The exam list did not load"
            body={exams.error?.message ?? 'Something went wrong talking to the server.'}
            actionLabel="Try again"
            onAction={() => exams.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No exams for that stream"
            body="Try another stream, or clear the filter to see the whole calendar."
            actionLabel="Show every exam"
            onAction={() => setStreams([])}
          />
        ) : (
          <ul className="border-t border-ink">
            {items.map((exam) => (
              <li key={exam.slug} className="border-b border-rule-soft py-6">
                <div className="grid gap-x-8 gap-y-5 lg:grid-cols-[1fr_26rem]">
                  <div className="min-w-0">
                    <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-soft">
                      <span>{exam.stream}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exam.level}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exam.mode}</span>
                    </p>

                    <h2 className="font-display text-2xl leading-tight tracking-[-0.02em]">
                      <Link to={`/exams/${exam.slug}`} className="link-underline">
                        {exam.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-[0.86rem] text-ink-soft">{exam.fullName}</p>

                    <p className="mt-3 text-[0.86rem] leading-relaxed text-ink-soft">{exam.description}</p>

                    <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-faint">
                      {exam.collegeCount} {exam.collegeCount === 1 ? 'college' : 'colleges'} listed accept it
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 self-start border-t border-rule-soft pt-4 lg:border-t-0 lg:pt-0">
                    <DateCell label="Application" iso={exam.applicationStart} />
                    <DateCell label="Exam day" iso={exam.examDate} />
                    <DateCell label="Result" iso={exam.resultDate} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 rule-t pt-5">
          <SampleDataNote />
        </div>
      </div>
    </div>
  );
}
