import jwt from 'jsonwebtoken';

import config from '../config.js';
import { ApiError } from './error.js';
import { getDb } from '../db/connection.js';

export const COOKIE_NAME = 'collegedost_token';

/**
 * The session cookie is httpOnly so no script can read it, and SameSite is
 * configurable because the prototype is deployed with the client and API on
 * different origins (Vercel + Render), which requires SameSite=None; Secure.
 * `secure` is on in production so the cookie is only ever sent over HTTPS.
 * There is no refresh token in the prototype — the cookie simply expires.
 */
export const cookieOptions = {
  httpOnly: true,
  sameSite: config.cookieSameSite,
  secure: config.isProd,
  path: '/',
  maxAge: config.jwtExpiresDays * 24 * 60 * 60 * 1000,
};

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: `${config.jwtExpiresDays}d`,
  });
}

export function setSessionCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions);
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
}

export function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name ?? null };
}

/** Reads the cookie if there is one. Never fails — absence is not an error. */
export function readUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const row = getDb().prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.sub);
    return row ?? null;
  } catch {
    // Expired or tampered with; treat it as signed out rather than a 401 loop.
    return null;
  }
}

/** For endpoints that need an account. */
export function requireAuth(req, res, next) {
  const user = readUser(req);
  if (!user) return next(ApiError.unauthorized('Sign in to use your saved shortlist.'));
  req.user = user;
  return next();
}

export default requireAuth;
