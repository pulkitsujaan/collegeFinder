import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import config from '../config.js';

let db = null;

/**
 * Opens (once) and returns the SQLite handle.
 *
 * WAL keeps reads from blocking behind the seed transaction; foreign keys are
 * enforced so a bad join row fails loudly at insert time rather than silently
 * producing orphans.
 */
export function getDb() {
  if (db) return db;

  fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });
  db = new Database(config.databaseFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

/** Runs schema.sql, which drops and recreates every table. */
export function applySchema(database = getDb()) {
  const sql = fs.readFileSync(config.schemaFile, 'utf8');
  database.exec(sql);
  return database;
}

/** True when the seeded dataset is present. Used for a friendly startup warning. */
export function isSeeded() {
  try {
    const row = getDb().prepare('SELECT COUNT(*) AS n FROM colleges').get();
    return row.n > 0;
  } catch {
    return false;
  }
}

/** Closes the handle — tests call this between suites. */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
