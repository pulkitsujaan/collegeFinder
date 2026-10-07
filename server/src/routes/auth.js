import { Router } from 'express';
import bcrypt from 'bcryptjs';

import { ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  publicUser,
  readUser,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
} from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import { getDb } from '../db/connection.js';

const router = Router();

const BCRYPT_ROUNDS = 10;

router.post('/register', authLimiter, validate(registerSchema, 'body'), (req, res, next) => {
  const { email, password, name } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return next(ApiError.conflict('An account with that email already exists. Try signing in.'));
  }

  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .run(email, hash, name ?? null);

  const user = { id: info.lastInsertRowid, email, name: name ?? null };
  setSessionCookie(res, user);
  return res.status(201).json({ user: publicUser(user) });
});

router.post('/login', authLimiter, validate(loginSchema, 'body'), (req, res, next) => {
  const { email, password } = req.body;
  const row = getDb()
    .prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?')
    .get(email);

  // One message for both "no such user" and "wrong password", so the endpoint
  // cannot be used to find out which emails have accounts.
  const ok = row && bcrypt.compareSync(password, row.password_hash);
  if (!ok) return next(ApiError.unauthorized('That email and password do not match.'));

  setSessionCookie(res, row);
  return res.json({ user: publicUser(row) });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/** Never 401s — the client uses this to decide whether to show a sign-in link. */
router.get('/me', (req, res) => {
  const user = readUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

export default router;
