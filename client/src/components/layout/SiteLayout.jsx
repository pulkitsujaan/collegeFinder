import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import TopBar from './TopBar.jsx';
import Footer from './Footer.jsx';
import RouteFallback from './RouteFallback.jsx';
import CompareTray from './CompareTray.jsx';
import PageTransition from './PageTransition.jsx';
import Toast from '../ui/Toast.jsx';
import { useCompare } from '../../lib/CompareContext.jsx';

/** The chrome that wraps every page: sticky top bar, main region, footer. */
export default function SiteLayout() {
  const { fullNotice, dismissNotice, max, count } = useCompare();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <TopBar />

      <main id="main" className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <PageTransition key={pathname}>
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>

      <Footer />

      <CompareTray />
      <Toast
        message={fullNotice ? `You can compare ${max} colleges at a time. Remove one first.` : null}
        onDismiss={dismissNotice}
      />

      {/* Keeps the compare tray from sitting on top of the footer. */}
      <div aria-hidden="true" className={count > 0 ? 'h-24' : 'h-0'} />
    </div>
  );
}
