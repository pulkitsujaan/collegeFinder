import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import MonogramChip from '../college/MonogramChip.jsx';
import { useCompare } from '../../lib/CompareContext.jsx';

/**
 * The compare tray: a slim bar that slides up once a college is selected and
 * follows the student from listing to detail page and back.
 */
export default function CompareTray() {
  const { items, count, remove, clear, max } = useCompare();
  const { pathname } = useLocation();

  // Pointless on the compare page itself, and it would cover the table's footer.
  const hidden = pathname === '/compare';

  return (
    <AnimatePresence>
      {count > 0 && !hidden && (
        <motion.div
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          exit={{ y: '110%' }}
          transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-forest-light bg-forest text-paper"
        >
          <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-paper/60">
                Compare {count}/{max}
              </span>

              <ul className="flex min-w-0 items-center gap-2">
                {items.map((college) => (
                  <li key={college.slug} className="flex items-center gap-2">
                    <MonogramChip college={college} size="sm" />
                    <span className="hidden max-w-[14rem] truncate text-[0.78rem] sm:inline">
                      {college.shortName || college.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(college.slug)}
                      className="font-mono text-[0.9rem] leading-none text-paper/60 transition-colors hover:text-marigold"
                      aria-label={`Remove ${college.name} from comparison`}
                    >
                      ×
                    </button>
                  </li>
                ))}

                {Array.from({ length: max - count }, (_, index) => (
                  <li
                    key={`empty-${index}`}
                    aria-hidden="true"
                    className="hidden h-8 w-8 border border-dashed border-paper/30 sm:block"
                  />
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clear}
                className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-paper/60 transition-colors hover:text-paper"
              >
                Clear
              </button>
              {count >= 2 ? (
                <Link
                  to="/compare"
                  className="border border-marigold bg-marigold px-4 py-2 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-paper"
                >
                  Compare ({count})
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="border border-paper/30 px-4 py-2 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-paper/40"
                >
                  Pick one more
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
