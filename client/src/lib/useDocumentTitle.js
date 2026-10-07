import { useEffect } from 'react';

/** Keeps the tab title in step with the page, including the search term. */
export default function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · CollegeDost` : 'CollegeDost';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
