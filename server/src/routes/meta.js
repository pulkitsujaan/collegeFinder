import { Router } from 'express';

import { getMeta } from '../db/repositories/meta.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(getMeta());
});

export default router;
