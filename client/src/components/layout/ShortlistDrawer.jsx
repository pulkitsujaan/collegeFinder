import { Link } from 'react-router-dom';

import Sheet from '../ui/Sheet.jsx';
import Button from '../ui/Button.jsx';
import MonogramChip from '../college/MonogramChip.jsx';
import RatingBadge from '../ui/RatingBadge.jsx';
import { useShortlist } from '../../lib/ShortlistContext.jsx';
import { useCompare } from '../../lib/CompareContext.jsx';

/**
 * The shortlist drawer. Saved colleges, kept in localStorage for the prototype
 * (and mirrored to the server once signed in), reachable from the top bar.
 */
export default function ShortlistDrawer({ open, onClose }) {
  const shortlist = useShortlist();
  const compare = useCompare();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Shortlist${shortlist.count ? ` (${shortlist.count})` : ''}`}
      labelId="shortlist-title"
      footer={
        shortlist.count > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <Button variant="quiet" size="sm" onClick={shortlist.clear}>
              Clear shortlist
            </Button>
            <Button variant="solid" size="sm" to="/compare" onClick={onClose}>
              Compare selected
            </Button>
          </div>
        ) : null
      }
    >
      {shortlist.count === 0 ? (
        <p className="py-10 text-center text-sm leading-relaxed text-ink-soft">
          Nothing saved yet. Tap <span className="font-mono text-[0.72rem] uppercase">Shortlist</span>{' '}
          on any college to keep it here while you look around.
        </p>
      ) : (
        <ul className="divide-y divide-rule-soft">
          {shortlist.items.map((college) => (
            <li key={college.slug} className="flex items-center gap-4 py-3">
              <MonogramChip college={college} />

              <div className="min-w-0 flex-1">
                <Link
                  to={`/college/${college.slug}`}
                  onClick={onClose}
                  className="link-underline block truncate font-display text-lg tracking-[-0.02em]"
                >
                  {college.name}
                </Link>
                <p className="mt-0.5 flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-soft">
                  <span>{college.city}</span>
                  {college.rating != null && <RatingBadge rating={college.rating} />}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => compare.toggle(college)}
                  className={`border px-2.5 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] transition-colors ${
                    compare.has(college.slug)
                      ? 'border-forest bg-forest text-paper'
                      : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  {compare.has(college.slug) ? 'Comparing' : 'Compare'}
                </button>
                <button
                  type="button"
                  onClick={() => shortlist.remove(college.slug)}
                  className="px-2 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-faint transition-colors hover:text-vermilion"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
