import { Router } from 'express';

import { ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { compareSchema } from '../schemas/query.js';
import { getCompare } from '../db/repositories/colleges.js';

const router = Router();

const MAX_COMPARE = 3;

router.get('/', validate(compareSchema), (req, res, next) => {
  const slugs = req.query.slugs;

  if (!slugs.length) {
    return next(ApiError.badRequest('Provide at least one college slug via ?slugs=a,b.'));
  }
  if (slugs.length > MAX_COMPARE) {
    return next(
      ApiError.badRequest(`You can compare up to ${MAX_COMPARE} colleges at a time.`, [
        { field: 'slugs', message: `Received ${slugs.length} slugs.` },
      ]),
    );
  }

  const items = getCompare(slugs);
  const missing = items.filter((item) => item.missing).map((item) => item.slug);
  if (missing.length === items.length) {
    return next(ApiError.notFound(`No colleges found for: ${missing.join(', ')}.`));
  }

  // Comparison rows are computed here so every client renders the same table.
  const present = items.filter((item) => !item.missing);
  const rows = [
    { key: 'city', label: 'City', type: 'text', values: present.map((c) => `${c.city}, ${c.state}`) },
    { key: 'ownership', label: 'Ownership', type: 'text', values: present.map((c) => c.ownership) },
    { key: 'establishedYear', label: 'Established', type: 'number', values: present.map((c) => c.establishedYear) },
    { key: 'rating', label: 'Student rating', type: 'rating', values: present.map((c) => c.rating), best: 'high' },
    { key: 'accreditation', label: 'Accreditation', type: 'text', values: present.map((c) => c.accreditation) },
    { key: 'highestPackageLpa', label: 'Highest package', type: 'lpa', values: present.map((c) => c.highestPackageLpa), best: 'high' },
    { key: 'avgPackageLpa', label: 'Average package', type: 'lpa', values: present.map((c) => c.avgPackageLpa), best: 'high' },
    { key: 'placementVerified', label: 'Placement data verified', type: 'boolean', values: present.map((c) => c.placementVerified) },
    { key: 'feeRange', label: 'Fee range (total)', type: 'feeRange', values: present.map((c) => c.feeRange) },
    { key: 'courseCount', label: 'Courses listed', type: 'number', values: present.map((c) => c.courses.length), best: 'high' },
    { key: 'campusSizeAcres', label: 'Campus size (acres)', type: 'number', values: present.map((c) => c.campusSizeAcres), best: 'high' },
    { key: 'exams', label: 'Entrance exams accepted', type: 'list', values: present.map((c) => c.exams) },
    { key: 'facilityCount', label: 'Facilities listed', type: 'number', values: present.map((c) => c.facilityCount), best: 'high' },
  ];

  return res.json({ items, rows, missing, maxCompare: MAX_COMPARE });
});

export default router;
