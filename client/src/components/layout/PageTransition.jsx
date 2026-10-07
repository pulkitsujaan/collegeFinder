import { motion, useReducedMotion } from 'motion/react';

/**
 * A short opacity-and-lift transition between routes. Keyed on the pathname
 * only — keying on the full location would remount the listing page every time
 * a filter changed, which would throw away scroll position for nothing.
 */
export default function PageTransition({ children }) {
  const reduced = useReducedMotion();

  if (reduced) return children;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
