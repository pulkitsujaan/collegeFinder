/**
 * Section headings carry the printed-prospectus rhythm: a hairline rule, a
 * mono eyebrow, then a large display line. `index` is the little chapter number
 * that runs down the page.
 */
export default function SectionHeading({
  eyebrow,
  title,
  index,
  action,
  description,
  className = '',
  as: Tag = 'h2',
}) {
  return (
    <div className={`rule-t flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-5 ${className}`}>
      <div className="max-w-2xl">
        {(eyebrow || index) && (
          <p className="eyebrow mb-3 flex items-center gap-3 text-ink-soft">
            {index && <span className="tabular-nums text-vermilion">{index}</span>}
            {eyebrow}
          </p>
        )}
        <Tag className="font-display text-display-sm tracking-[-0.02em]">{title}</Tag>
        {description && (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
