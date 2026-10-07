import rateLimit from 'express-rate-limit';

const message = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Give it a moment and try again.' },
};

/** Auth endpoints get the tightest budget — they are the brute-force targets. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

/** Typeahead fires on every keystroke, so it needs a ceiling but a loose one. */
export const suggestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

/** A general ceiling for the read API. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});
