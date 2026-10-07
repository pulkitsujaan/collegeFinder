import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Resolve paths against the server/ directory so scripts work from the repo root too.
export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseFile: path.resolve(SERVER_ROOT, process.env.DATABASE_FILE || 'data/collegedost.sqlite'),
  schemaFile: path.join(SERVER_ROOT, 'src/db/schema.sql'),
  seedDataDir: path.join(SERVER_ROOT, 'data'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresDays: num(process.env.JWT_EXPIRES_DAYS, 7),
};

export default config;
