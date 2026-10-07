import { useEffect, useRef } from 'react';

/**
 * A bottom sheet on phones, a plain panel on desktop. Used by the mobile filter
 * panel and the shortlist drawer. Escape closes it, the page behind it stops
 * scrolling, and focus moves inside so a keyboard never lands on hidden content.
 */
export default function Sheet({ open, onClose, title, labelId, children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTarget = panelRef.current?.querySelector(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    focusTarget?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/45"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className="relative flex max-h-[92vh] w-full flex-col border border-rule bg-paper shadow-sheet sm:max-w-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4">
          <h2 id={labelId} className="font-display text-xl tracking-[-0.02em]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-vermilion"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5" data-lenis-prevent>
          {children}
        </div>

        {footer && <footer className="border-t border-rule px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
