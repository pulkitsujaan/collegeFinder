import { Router } from 'express';

import { ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { examListSchema, slugSchema } from '../schemas/query.js';
import { listExams, getExamBySlug } from '../db/repositories/exams.js';

const router = Router();

router.get('/', validate(examListSchema), (req, res) => {
  res.json({ items: listExams(req.query) });
});

router.get('/:slug', validate(slugSchema, 'params'), (req, res, next) => {
  const exam = getExamBySlug(req.params.slug);
  if (!exam) return next(ApiError.notFound(`No exam with the slug "${req.params.slug}".`));
  return res.json(exam);
});

export default router;
