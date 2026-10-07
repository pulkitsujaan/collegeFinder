import { Router } from 'express';

import { ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { suggestLimiter } from '../middleware/rateLimit.js';
import { collegeFilterSchema, suggestSchema, slugSchema } from '../schemas/query.js';
import {
  searchColleges,
  getFacets,
  suggest,
  getCollegeBySlug,
  getAllSlugs,
} from '../db/repositories/colleges.js';

const router = Router();

/** Maps the raw facet Maps into the arrays the client consumes. */
function serialiseFacets(facets, input) {
  const entries = (map) => [...map.entries()].map(([value, count]) => ({ value, count }));

  const courses = entries(facets.course);
  const streams = entries(facets.stream);
  const states = entries(facets.state);
  const ownership = entries(facets.ownership);
  const exams = entries(facets.exam);

  return {
    course: courses,
    stream: streams,
    city: facets.city,
    state: states,
    ownership,
    exam: exams,
    rating: entries(facets.rating)
      .map(({ value, count }) => ({ value: Number(value), count }))
      .sort((a, b) => a.value - b.value),
    placementVerified: facets.placementVerified,
    ranges: {
      fees: { min: facets.ranges.minFees, max: facets.ranges.maxFees },
      highestPackage: {
        min: facets.ranges.minHighestPackage,
        max: facets.ranges.maxHighestPackage,
      },
      avgPackage: { min: facets.ranges.minAvgPackage, max: facets.ranges.maxAvgPackage },
      established: { min: facets.ranges.minEstablished, max: facets.ranges.maxEstablished },
    },
    appliedFilters: {
      course: input.course ?? [],
      stream: input.stream ?? [],
      city: input.city ?? [],
      state: input.state ?? [],
      ownership: input.ownership ?? [],
      exam: input.exam ?? [],
    },
  };
}

router.get('/', validate(collegeFilterSchema), (req, res) => {
  res.json(searchColleges(req.query));
});

router.get('/facets', validate(collegeFilterSchema), (req, res) => {
  res.json(serialiseFacets(getFacets(req.query), req.query));
});

router.get('/suggest', suggestLimiter, validate(suggestSchema), (req, res) => {
  res.json({ items: suggest(req.query.q, 8) });
});

/** Used by the verification script to sweep every seeded college. */
router.get('/slugs', (req, res) => {
  res.json({ slugs: getAllSlugs() });
});

router.get('/:slug', validate(slugSchema, 'params'), (req, res, next) => {
  const college = getCollegeBySlug(req.params.slug);
  if (!college) return next(ApiError.notFound(`No college with the slug "${req.params.slug}".`));
  return res.json(college);
});

export default router;
