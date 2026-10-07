import { Link } from 'react-router-dom';

import useDocumentTitle from '../lib/useDocumentTitle.js';

export default function NotFound() {
  useDocumentTitle('Page not found');

  return (
    <section className="shell grid min-h-[60vh] place-items-center py-24 text-center">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="font-display mt-5 text-display-md">This page isn&apos;t on the map.</h1>
        <p className="mx-auto mt-5 max-w-md text-ink-soft">
          The link may be old, or the page may have moved. The college listing is a good place to
          pick things back up.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link to="/" className="bg-ink px-6 py-3 text-sm text-paper hover:bg-forest">
            Back home
          </Link>
          <Link
            to="/colleges"
            className="link-underline font-mono text-xs uppercase tracking-[0.14em] text-ink-soft"
          >
            Browse colleges
          </Link>
        </div>
      </div>
    </section>
  );
}
