import Button from './Button.jsx';

/**
 * Empty state that always offers a way out. The illustration is a small
 * generated archway — same vocabulary as the college covers, drawn inline so
 * there is no image to load and nothing to go 404.
 */
function EmptyArch() {
  return (
    <svg viewBox="0 0 200 120" role="presentation" className="h-24 w-40 text-ink-faint">
      <g fill="none" stroke="currentColor" strokeWidth="1.25">
        <path d="M28 112V62a22 22 0 0 1 44 0v50" />
        <path d="M100 112V46a22 22 0 0 1 44 0v66" />
        <path d="M8 112h184" />
      </g>
      <path d="M100 112V46a22 22 0 0 1 44 0v66" fill="currentColor" opacity="0.12" />
    </svg>
  );
}

export default function EmptyState({
  title = 'Nothing here yet',
  body,
  actionLabel,
  onAction,
  actionTo,
}) {
  return (
    <div className="flex flex-col items-center gap-5 border border-rule-soft bg-paper-2/50 px-6 py-16 text-center">
      <EmptyArch />
      <h3 className="max-w-md font-display text-2xl tracking-[-0.02em]">{title}</h3>
      {body && <p className="max-w-prose text-sm leading-relaxed text-ink-soft">{body}</p>}
      {actionLabel && (
        <Button variant="solid" onClick={onAction} to={actionTo}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
