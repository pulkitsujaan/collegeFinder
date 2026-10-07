import { ApiError } from './error.js';

/**
 * Validates a request part against a zod schema and replaces it with the
 * parsed result, so handlers only ever see clean, typed values.
 *
 * Every failure returns 400 with per-field detail rather than a bare "bad
 * request", which makes the listing filters debuggable from the URL alone.
 */
export function validate(schema, source = 'query') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      }));
      return next(ApiError.badRequest('Some request parameters are invalid.', details));
    }
    req[source] = result.data;
    return next();
  };
}

export default validate;
