/**
 * Error helpers + the central error handler.
 *
 * Every error response has the shape `{ error: { code, message, details? } }`
 * so the client only ever has to parse one shape.
 */

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static unauthorized(message = 'Not signed in') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static conflict(message, details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static tooMany(message = 'Too many requests') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
}

/** 404 handler — runs when no route matched. */
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/** Terminal error handler. Must keep the 4-argument signature for Express. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Body-parser throws this when sent malformed JSON.
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'BAD_JSON', message: 'Request body is not valid JSON.' },
    });
  }

  const status = err instanceof ApiError ? err.status : (err.status ?? 500);
  const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR';
  const message =
    status >= 500 ? 'Something went wrong on our end.' : (err.message ?? 'Request failed.');

  if (status >= 500) {
    console.error('[error]', err);
  }

  const payload = { error: { code, message } };
  if (err.details) payload.error.details = err.details;
  res.status(status).json(payload);
}
