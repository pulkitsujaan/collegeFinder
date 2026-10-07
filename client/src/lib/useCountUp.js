import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts a number up when it scrolls into view. Under `prefers-reduced-motion`
 * the final value is rendered immediately — the number is the point, the
 * animation is not.
 */
export default function useCountUp(target, { duration = 1400 } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (target == null) return undefined;
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }

    const element = ref.current;
    if (!element) return undefined;

    let frame = 0;
    let start = 0;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      // Ease out cubic — fast off the mark, settles gently on the number.
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          frame = requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, duration]);

  return [ref, value];
}
