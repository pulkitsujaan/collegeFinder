import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/**
 * Transient notices — a friendly word when the compare tray is full, or a
 * confirmation when something is shortlisted. Announced politely so screen
 * readers hear it without losing their place.
 */
export default function Toast({ message, onDismiss, duration = 4000 }) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return undefined;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 sm:bottom-8"
    >
      <AnimatePresence>
        {visible && message && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="pointer-events-auto max-w-md border border-forest-light bg-forest px-5 py-3 text-center font-mono text-[0.7rem] uppercase tracking-[0.12em] text-paper shadow-lift"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
