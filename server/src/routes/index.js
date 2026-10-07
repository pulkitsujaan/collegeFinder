import { Router } from 'express';

import collegesRouter from './colleges.js';
import metaRouter from './meta.js';
import examsRouter from './exams.js';
import compareRouter from './compare.js';
import rankingsRouter from './rankings.js';
import authRouter from './auth.js';
import shortlistRouter from './shortlist.js';
import { isSeeded } from '../db/connection.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'collegedost-api',
    uptime: Math.round(process.uptime()),
    database: isSeeded() ? 'seeded' : 'empty',
  });
});

router.use('/colleges', collegesRouter);
router.use('/meta', metaRouter);
router.use('/exams', examsRouter);
router.use('/compare', compareRouter);
router.use('/rankings', rankingsRouter);
router.use('/auth', authRouter);
router.use('/shortlist', shortlistRouter);

export default router;
