import { Link } from 'react-router-dom';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { to: '/colleges', label: 'All colleges' },
      { to: '/rankings', label: 'Rankings' },
      { to: '/exams', label: 'Entrance exams' },
      { to: '/compare', label: 'Compare colleges' },
    ],
  },
  {
    title: 'Popular courses',
    links: [
      { to: '/colleges?course=btech', label: 'B.Tech colleges' },
      { to: '/colleges?course=mba', label: 'MBA colleges' },
      { to: '/colleges?course=bba', label: 'BBA colleges' },
      { to: '/colleges?course=mbbs', label: 'MBBS colleges' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="theme-forest mt-24 border-t border-rule">
      <div className="shell grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <p className="font-display text-3xl tracking-[-0.02em] md:text-4xl">
            Grade<span className="text-marigold">Go</span>
          </p>
          <p className="mt-4 max-w-sm text-sm text-ink-soft">
            A calmer way to find a college in India. Pick a course, pick a city, then narrow by
            fees, exams and placements — with every number shown next to where it came from.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="md:col-span-3">
            <h2 className="eyebrow text-ink-faint">{column.title}</h2>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="link-underline text-sm text-ink-soft">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="md:col-span-1" />
      </div>

      <div className="border-t border-rule">
        <div className="shell flex flex-col gap-3 py-6 text-xs text-ink-faint md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl">
            <span className="font-mono uppercase tracking-[0.14em] text-marigold">Sample data</span>{' '}
            — this is a prototype. College names are real; fees, packages, ratings and dates are
            illustrative. Always verify details on the official college website.
          </p>
          <p className="font-mono uppercase tracking-[0.14em]">© {year} GradeGo</p>
        </div>
      </div>
    </footer>
  );
}
