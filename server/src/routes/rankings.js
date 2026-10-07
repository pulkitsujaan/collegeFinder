import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import { rankingsSchema } from '../schemas/query.js';
import { getRankings } from '../db/repositories/colleges.js';
import { getDb } from '../db/connection.js';

const router = Router();

/**
 * Student-choice ranking.
 *
 * score = rating × 6 + min(avg package, 30) × 1.2 + min(highest package, 60) × 0.35,
 * nudged 3% for colleges whose placement data is marked verified. Rating carries
 * the most weight because it is the broadest signal; the packages are capped so
 * one outlier placement cannot carry a college to the top on its own.
 */
const FORMULA =
  'score = rating × 6 + min(avg package LPA, 30) × 1.2 + min(highest package LPA, 60) × 0.35, ×1.03 when placement data is verified';

router.get('/', validate(rankingsSchema), (req, res) => {
  const { course, limit } = req.query;
  res.json({
    course: course ?? null,
    formula: FORMULA,
    items: getRankings({ course, limit }),
  });
});

/** The courses that have enough colleges behind them to be worth ranking. */
router.get('/courses', (req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT co.slug, co.name, co.stream, COUNT(DISTINCT cc.college_id) AS count
       FROM courses co
       JOIN college_courses cc ON cc.course_id = co.id
       GROUP BY co.id
       HAVING count > 0
       ORDER BY count DESC, co.name`,
    )
    .all();
  res.json({ items: rows });
});

export default router;
