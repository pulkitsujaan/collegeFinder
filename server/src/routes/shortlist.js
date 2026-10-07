import { Router } from 'express';

import { ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { shortlistSchema } from '../schemas/auth.js';
import { getDb } from '../db/connection.js';
import { mapCollege } from '../db/repositories/colleges.js';

/**
 * The server-side shortlist. The prototype keeps a copy in localStorage and
 * syncs here on sign-in, so the list survives a new browser.
 */
const router = Router();

const SHORTLIST_COLUMNS = `
  c.id, c.slug, c.name, c.short_name, c.city, c.state, c.region_group, c.ownership,
  c.established_year, c.rating, c.highest_package_lpa, c.avg_package_lpa,
  c.placement_verified, c.accreditation, c.campus_size_acres, c.brand_hue, c.data_source
`;

const listFor = (userId) =>
  getDb()
    .prepare(
      `SELECT ${SHORTLIST_COLUMNS}, s.created_at AS saved_at
       FROM shortlists s
       JOIN colleges c ON c.id = s.college_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
    )
    .all(userId)
    .map((row) => ({ ...mapCollege(row), savedAt: row.saved_at }));

/**
 * Every shortlist response — GET, POST and DELETE — has the same shape, so the
 * client can drop the result of a save straight into the same state it read
 * from a list. `slugs` is there so "is this college saved?" is a lookup, not a
 * scan of the objects.
 */
const withColleges = (req) => {
  const items = listFor(req.user.id);
  return { items, slugs: items.map((item) => item.slug) };
};

router.get('/', requireAuth, (req, res) => {
  res.json(withColleges(req));
});

router.post('/', requireAuth, validate(shortlistSchema, 'body'), (req, res, next) => {
  const db = getDb();
  const college = db.prepare('SELECT id FROM colleges WHERE slug = ?').get(req.body.slug);
  if (!college) return next(ApiError.notFound(`No college with the slug "${req.body.slug}".`));

  db.prepare('INSERT OR IGNORE INTO shortlists (user_id, college_id) VALUES (?, ?)').run(
    req.user.id,
    college.id,
  );

  return res.status(201).json(withColleges(req));
});

router.delete('/:slug', requireAuth, validate(shortlistSchema, 'params'), (req, res, next) => {
  const db = getDb();
  const college = db.prepare('SELECT id FROM colleges WHERE slug = ?').get(req.params.slug);
  if (!college) return next(ApiError.notFound(`No college with the slug "${req.params.slug}".`));

  db.prepare('DELETE FROM shortlists WHERE user_id = ? AND college_id = ?').run(
    req.user.id,
    college.id,
  );

  return res.json(withColleges(req));
});

export default router;
