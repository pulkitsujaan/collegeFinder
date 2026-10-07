import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import Wordmark from './Wordmark.jsx';
import ShortlistDrawer from './ShortlistDrawer.jsx';
import { useShortlist } from '../../lib/ShortlistContext.jsx';
import { useCompare } from '../../lib/CompareContext.jsx';
import { useAuth } from '../../lib/AuthContext.jsx';

const NAV = [
  { to: '/colleges', label: 'Colleges' },
  { to: '/exams', label: 'Exams' },
  { to: '/rankings', label: 'Rankings' },
];

/** Sticky, deliberately thin top bar. The real navigation is the home page. */
export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const shortlist = useShortlist();
  const compare = useCompare();
  const auth = useAuth();

  // Close the mobile panel on navigation, otherwise it covers the new page.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-rule bg-paper/95 backdrop-blur-[2px]">
        <div className="shell flex h-[var(--topbar-h)] items-center justify-between gap-6">
          <Wordmark />

          <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `link-underline font-mono text-[0.72rem] uppercase tracking-[0.14em] transition-colors ${
                    isActive ? 'text-vermilion' : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {compare.count > 0 && (
              <NavLink
                to="/compare"
                className={({ isActive }) =>
                  `link-underline font-mono text-[0.72rem] uppercase tracking-[0.14em] transition-colors ${
                    isActive ? 'text-vermilion' : 'text-ink-soft hover:text-ink'
                  }`
                }
              >
                Compare <span className="tabular-nums">({compare.count})</span>
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `hidden border border-rule px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] transition-colors hover:border-ink sm:block ${
                  isActive ? 'text-vermilion' : 'text-ink-soft'
                }`
              }
            >
              {auth.isSignedIn ? auth.user.name || 'Your account' : 'Sign in'}
            </NavLink>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 border border-rule px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink"
            >
              <span>Shortlist</span>
              <span
                className={`tabular-nums ${shortlist.count ? 'text-vermilion' : 'text-ink-faint'}`}
              >
                {shortlist.count}
              </span>
              <span className="sr-only">colleges saved</span>
            </button>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="border border-rule px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] md:hidden"
            >
              {open ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        {open && (
          <nav
            id="mobile-nav"
            aria-label="Primary (mobile)"
            className="border-t border-rule bg-paper md:hidden"
          >
            <ul className="shell flex flex-col py-2">
              {NAV.map((item) => (
                <li key={item.to} className="border-b border-rule-soft last:border-b-0">
                  <NavLink to={item.to} className="block py-3 font-display text-2xl tracking-[-0.02em]">
                    {item.label}
                  </NavLink>
                </li>
              ))}
              {compare.count > 0 && (
                <li className="border-b border-rule-soft">
                  <NavLink to="/compare" className="block py-3 font-display text-2xl tracking-[-0.02em]">
                    Compare ({compare.count})
                  </NavLink>
                </li>
              )}
              <li className="border-b border-rule-soft last:border-b-0">
                <NavLink to="/login" className="block py-3 font-display text-2xl tracking-[-0.02em]">
                  {auth.isSignedIn ? 'Your account' : 'Sign in'}
                </NavLink>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <ShortlistDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
