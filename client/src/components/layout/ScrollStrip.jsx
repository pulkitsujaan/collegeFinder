import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A horizontally scrolling strip that can be dragged with the mouse, nudged
 * with the wheel, and stepped with arrow buttons for keyboard users.
 *
 * The wheel only takes over when the strip can still move in that direction;
 * at either end the page scrolls normally, which is what stops this from
 * feeling like a trap.
 */
export default function ScrollStrip({ children, label, className = '' }) {
  const ref = useRef(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    setEdges({
      start: element.scrollLeft <= 2,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    measure();
    element.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);

    const onWheel = (event) => {
      const canRight = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
      const canLeft = element.scrollLeft > 1;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const delta = horizontal ? event.deltaX : event.deltaY;

      if ((delta > 0 && !canRight) || (delta < 0 && !canLeft)) return;
      event.preventDefault();
      element.scrollLeft += delta;
    };
    // Not passive: we need preventDefault for the case above.
    element.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      element.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      element.removeEventListener('wheel', onWheel);
    };
  }, [measure]);

  // Capture is deliberately NOT taken here. Capturing on pointerdown retargets
  // the matching pointerup to the strip, so the browser dispatches click on the
  // strip's ancestor and any link inside the card never navigates. Capture is
  // taken in onPointerMove instead, once the gesture is definitely a drag.
  const onPointerDown = (event) => {
    if (event.pointerType === 'touch') return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startScroll: ref.current.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event) => {
    if (!drag.current.active) return;
    const delta = event.clientX - drag.current.startX;

    if (!drag.current.moved) {
      if (Math.abs(delta) <= 3) return;
      drag.current.moved = true;
      // Only now, so the pointer keeps following even if it leaves the strip.
      ref.current.setPointerCapture?.(event.pointerId);
    }

    ref.current.scrollLeft = drag.current.startScroll - delta;
  };

  const endDrag = (event) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (ref.current.hasPointerCapture?.(event.pointerId)) {
      ref.current.releasePointerCapture(event.pointerId);
    }
  };

  // A drag should not leave the card's link activated.
  const onClickCapture = (event) => {
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
  };

  const nudge = (direction) => {
    ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className={`relative ${className}`}>
      <ul
        ref={ref}
        aria-label={label}
        data-lenis-prevent
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className="hide-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 select-none"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {children}
      </ul>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={edges.start}
          className="border border-rule px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35"
        >
          <span aria-hidden="true">←</span>
          <span className="sr-only">Scroll {label} left</span>
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={edges.end}
          className="border border-rule px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35"
        >
          <span aria-hidden="true">→</span>
          <span className="sr-only">Scroll {label} right</span>
        </button>
        <span className="ml-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">
          Drag or scroll
        </span>
      </div>
    </div>
  );
}
