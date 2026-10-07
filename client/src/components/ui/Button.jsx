import { Link } from 'react-router-dom';

/**
 * The one button in the system. `vermilion` is reserved for the single primary
 * action on a page — everything else is outline or bare, so the accent keeps
 * its weight. Presses move down 1px rather than scaling, which suits print.
 */

const VARIANTS = {
  solid:
    'bg-vermilion text-paper border border-vermilion hover:bg-vermilion-dark hover:border-vermilion-dark',
  ink: 'bg-ink text-paper border border-ink hover:bg-forest hover:border-forest',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-paper',
  quiet: 'border border-rule text-ink-soft hover:border-ink hover:text-ink',
  forest: 'bg-forest text-paper border border-forest hover:bg-forest-deep',
  bare: 'border-0 text-ink-soft hover:text-vermilion underline-offset-4 hover:underline',
};

const SIZES = {
  sm: 'px-3 py-2 text-[0.68rem]',
  md: 'px-5 py-2.5 text-[0.72rem]',
  lg: 'px-7 py-3.5 text-[0.78rem]',
};

const BASE =
  'inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.14em] ' +
  'transition-colors duration-150 ease-editorial active:translate-y-px disabled:pointer-events-none disabled:opacity-45';

export default function Button({
  children,
  variant = 'outline',
  size = 'md',
  to,
  href,
  className = '',
  type = 'button',
  ...rest
}) {
  const classes = `${BASE} ${VARIANTS[variant] ?? VARIANTS.outline} ${SIZES[size] ?? SIZES.md} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} rel="noreferrer noopener" target="_blank" {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
