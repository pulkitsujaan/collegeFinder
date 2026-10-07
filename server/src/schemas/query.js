import { z } from 'zod';

/**
 * Query-parameter building blocks. Values arrive as strings, may be repeated,
 * or may be comma-separated lists, so each helper normalises before validating.
 */

/** "a,b,c" | ["a","b"] | "a" → ["a","b","c"] */
export const csvList = (itemSchema = z.string().trim().min(1)) =>
  z
    .preprocess((value) => {
      if (value == null || value === '') return undefined;
      const parts = Array.isArray(value) ? value : String(value).split(',');
      const cleaned = parts.map((part) => String(part).trim()).filter(Boolean);
      return cleaned.length ? cleaned : undefined;
    }, z.array(itemSchema).max(40).optional())
    .transform((value) => value ?? []);

/** "12.5" → 12.5, "" → undefined, "abc" → validation error */
export const numberParam = (schema = z.number().finite()) =>
  z.preprocess(
    (value) => (value === '' || value == null ? undefined : Number(value)),
    schema.optional(),
  );

export const integerParam = (schema = z.number().int()) =>
  z.preprocess(
    (value) => (value === '' || value == null ? undefined : Number(value)),
    schema.optional(),
  );

/** "true"/"false" (and real booleans) → boolean; anything else is a 400. */
export const booleanParam = z.preprocess((value) => {
  if (value === '' || value == null) return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value; // let zod reject it
}, z.boolean().optional());

export const SORT_VALUES = [
  'relevance',
  'rating',
  'highest_package',
  'avg_package',
  'fees_asc',
  'fees_desc',
  'name',
];

/** The filter set shared by /colleges and /colleges/facets. */
export const collegeFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  course: csvList(),
  stream: csvList(),
  city: csvList(),
  state: csvList(),
  ownership: csvList(z.enum(['Government', 'Private', 'Deemed', 'Autonomous'])),
  exam: csvList(),
  minRating: numberParam(z.number().min(0).max(10)),
  minFees: numberParam(z.number().min(0)),
  maxFees: numberParam(z.number().min(0)),
  minPackage: numberParam(z.number().min(0).max(200)),
  minHighestPackage: numberParam(z.number().min(0).max(300)),
  placementVerified: booleanParam,
  establishedMin: integerParam(z.number().int().min(1800).max(2100)),
  establishedMax: integerParam(z.number().int().min(1800).max(2100)),
  sort: z.enum(SORT_VALUES).optional().default('relevance'),
  page: integerParam(z.number().int().min(1)).default(1),
  pageSize: integerParam(z.number().int().min(1).max(48)).default(12),
});

export const suggestSchema = z.object({
  q: z.string().trim().min(1, 'Search text is required.').max(80),
});

export const compareSchema = z.object({
  slugs: csvList(),
});

export const examListSchema = z.object({
  stream: csvList(),
  level: z.enum(['UG', 'PG', 'UG/PG']).optional(),
});

export const rankingsSchema = z.object({
  course: z.string().trim().min(1).max(60).optional(),
  limit: integerParam(z.number().int().min(1).max(50)).default(20),
});

export const slugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens.'),
});
