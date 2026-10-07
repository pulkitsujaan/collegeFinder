import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import AppRoutes from './routes.jsx';
import { useSmoothScroll } from './lib/useSmoothScroll.js';

/** Resets scroll on navigation so a new page always starts at the top. */
function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  useSmoothScroll();

  return (
    <>
      <a
        href="#main"
        className="sr-only-focusable fixed left-3 top-3 z-[100] bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-paper"
      >
        Skip to content
      </a>
      <ScrollToTopOnNavigate />
      <AppRoutes />
    </>
  );
}
