import { Link } from 'react-router-dom';

/** The wordmark: a printed monogram block plus the name. */
export default function Wordmark({ as: Tag = Link, to = '/', className = '' }) {
  return (
    <Tag to={to} className={`group inline-flex items-baseline gap-2 ${className}`}>
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 translate-y-[-1px] bg-vermilion transition-transform duration-200 ease-editorial group-hover:rotate-45"
      />
      <span className="font-display text-[1.35rem] leading-none tracking-[-0.02em]">
        College<span className="text-vermilion">Dost</span>
      </span>
    </Tag>
  );
}
