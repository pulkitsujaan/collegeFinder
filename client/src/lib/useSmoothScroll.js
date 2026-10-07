import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Momentum scrolling for wheel input — part of the "immersive" feel.
 *
 * Skipped entirely when the user prefers reduced motion, and on touch devices
 * where the native scroll is already better. Returns nothing; mounting is the
 * whole API.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (prefersReduced || isTouch) return undefined;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Let the OS handle touch; Lenis would fight native inertia.
      syncTouch: false,
    });

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    // Lenis honours `data-lenis-prevent` itself: on those elements it stays out
    // of the way and lets the browser scroll natively. We deliberately do not
    // add our own wheel listener — a capture-phase stopPropagation here would
    // swallow the event before the element's own handler could see it.

    // Anchor links (skip link, detail-page section tabs) scroll via Lenis so
    // they share its easing and the sticky chrome's offset.
    const onAnchorClick = (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!anchor) return;
      const id = anchor.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (target) {
        event.preventDefault();
        lenis.scrollTo(target, { offset: -128 });
      }
    };
    document.addEventListener('click', onAnchorClick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('click', onAnchorClick);
      lenis.destroy();
    };
  }, []);
}

export default useSmoothScroll;
