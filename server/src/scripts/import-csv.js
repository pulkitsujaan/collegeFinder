/**
 * Loads real college data from a CSV, on top of an already-seeded database.
 *
 *   npm run seed                                   # reference data: courses, exams, cities
 *   npm run import:csv -- path/to/colleges.csv     # your colleges
 *   npm run import:csv -- path/to/colleges.csv --replace
 *
 * Why it sits on top of the seed: courses, exams and facilities are reference
 * data that the rest of the app joins against. The importer checks every
 * reference a row makes and refuses the whole file if one is unknown, rather
 * than quietly dropping rows. `--replace` clears the seeded sample colleges
 * first, so you end up with only your data.
 *
 * Every imported row is stamped data_source = "csv" (or whatever the row's own
 * data_source column says), so imported facts are never confused with the
 * sample ones the prototype ships with.
 *
 * Columns — one row per college–course pair; college fields repeat:
 *
 *   college_slug          required, unique per college, [a-z0-9-]
 *   college_name          required
 *   short_name            optional, used for the generated cover monogram
 *   city                  required, must exist in server/data/cities.json
 *   state                 optional, defaults to the city's state
 *   region_group          optional, e.g. "Delhi-NCR"
 *   ownership             required, one of Government | Private | Deemed | Autonomous
 *   established_year      required, 1800–2100
 *   website               optional, bare domain, e.g. "iitb.ac.in"
 *   rating                0–10
 *   highest_package_lpa   number, LPA
 *   avg_package_lpa       number, LPA
 *   placement_verified    0 | 1
 *   accreditation         optional, e.g. "NAAC A++"
 *   campus_size_acres     number
 *   latitude, longitude   numbers
 *   brand_hue             0–360, drives the generated cover art
 *   description           optional; a plain sentence or two
 *   course_slug           required, must exist in server/data/courses.json
 *   total_fees_inr        integer rupees for the whole course
 *   seats                 integer
 *   eligibility           optional free text
 *   cutoff_note           optional free text
 *   cutoff_value          optional number, used by the predictor
 *   exam_slugs            optional, slugs separated by "|"
 *   data_source           optional, defaults to "csv"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../config.js';
import { getDb, isSeeded, closeDb } from '../db/connection.js';

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/**
 * A small RFC-4180-ish reader: handles quoted fields, escaped quotes ("") and
 * newlines inside quotes. Enough for data exported from a spreadsheet; if you
 * need more than this, convert to JSON and write a bespoke importer.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const source = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ''));
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const OWNERSHIP = new Set(['Government', 'Private', 'Deemed', 'Autonomous']);
const SLUG = /^[a-z0-9-]+$/;

const numberOr = (value, fallback = null) => {
  if (value == null || String(value).trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const flag = (value) => {
  const text = String(value ?? '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' ? 1 : 0;
};

/** Everything wrong with the file, so one run reports every problem at once. */
function validate(rows, { courseSlugs, cityByName, examSlugs }) {
  const problems = [];
  const seen = new Set();

  rows.forEach((row, index) => {
    const line = index + 2; // +1 for the header, +1 for 1-based counting
    const fail = (message) => problems.push(`line ${line}: ${message}`);

    if (!row.college_slug) fail('college_slug is required');
    else if (!SLUG.test(row.college_slug)) fail(`college_slug "${row.college_slug}" must be lowercase letters, numbers and hyphens`);
    if (!row.college_name) fail('college_name is required');
    if (!row.city) fail('city is required');
    else if (!cityByName.has(row.city)) fail(`unknown city "${row.city}" — add it to server/data/cities.json first`);
    if (!OWNERSHIP.has(row.ownership)) {
      fail(`ownership "${row.ownership}" must be one of ${[...OWNERSHIP].join(', ')}`);
    }

    const year = numberOr(row.established_year);
    if (year == null || year < 1800 || year > 2100) fail('established_year must be between 1800 and 2100');

    if (!row.course_slug) fail('course_slug is required');
    else if (!courseSlugs.has(row.course_slug)) fail(`unknown course_slug "${row.course_slug}"`);

    const key = `${row.college_slug}::${row.course_slug}`;
    if (seen.has(key)) fail(`duplicate row for ${key}`);
    seen.add(key);

    for (const slug of (row.exam_slugs ?? '').split('|').map((item) => item.trim()).filter(Boolean)) {
      if (!examSlugs.has(slug)) fail(`unknown exam slug "${slug}"`);
    }

    const rating = numberOr(row.rating);
    if (rating != null && (rating < 0 || rating > 10)) fail('rating must be between 0 and 10');

    const hue = numberOr(row.brand_hue);
    if (hue != null && (hue < 0 || hue > 360)) fail('brand_hue must be between 0 and 360');
  });

  return problems;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export function importCsv(filePath, { replace = false } = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No such file: ${filePath}`);
  }

  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one data row.');

  const header = rows[0].map((name) => name.trim());
  const records = rows.slice(1).map((values) => {
    const record = {};
    header.forEach((name, index) => {
      record[name] = (values[index] ?? '').trim();
    });
    return record;
  });

  const db = getDb();

  // Deliberately no applySchema() here: schema.sql drops every table, and an
  // importer that silently wipes the database you pointed it at is a bug, not
  // a feature. If the reference data is missing we say so and stop.
  if (!isSeeded()) {
    throw new Error(
      'The database is not seeded yet. Run `npm run seed` first — the importer needs courses, exams and facilities to exist.',
    );
  }

  const courseSlugs = new Set(db.prepare('SELECT slug FROM courses').all().map((row) => row.slug));
  const examSlugs = new Set(db.prepare('SELECT slug FROM exams').all().map((row) => row.slug));
  const cityByName = new Map(
    JSON.parse(fs.readFileSync(path.join(config.seedDataDir, 'cities.json'), 'utf8')).map((city) => [
      city.name,
      city,
    ]),
  );

  const problems = validate(records, { courseSlugs, cityByName, examSlugs });
  if (problems.length) {
    throw new Error(`The CSV has ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  }

  const insertCollege = db.prepare(`
    INSERT INTO colleges (
      slug, name, short_name, city, state, region_group, ownership, established_year,
      description, website, rating, highest_package_lpa, avg_package_lpa, placement_verified,
      accreditation, campus_size_acres, latitude, longitude, brand_hue, data_source
    ) VALUES (
      @slug, @name, @shortName, @city, @state, @regionGroup, @ownership, @establishedYear,
      @description, @website, @rating, @highestPackage, @avgPackage, @placementVerified,
      @accreditation, @campusSizeAcres, @latitude, @longitude, @brandHue, @dataSource
    )
  `);

  const updateCollege = db.prepare(`
    UPDATE colleges SET
      name = @name, short_name = @shortName, city = @city, state = @state,
      region_group = @regionGroup, ownership = @ownership, established_year = @establishedYear,
      description = @description, website = @website, rating = @rating,
      highest_package_lpa = @highestPackage, avg_package_lpa = @avgPackage,
      placement_verified = @placementVerified, accreditation = @accreditation,
      campus_size_acres = @campusSizeAcres, latitude = @latitude, longitude = @longitude,
      brand_hue = @brandHue, data_source = @dataSource
    WHERE slug = @slug
  `);

  const courseIdBySlug = new Map(
    db.prepare('SELECT id, slug FROM courses').all().map((row) => [row.slug, row.id]),
  );
  const examIdBySlug = new Map(
    db.prepare('SELECT id, slug FROM exams').all().map((row) => [row.slug, row.id]),
  );

  const summary = { colleges: 0, updated: 0, courses: 0, links: 0 };

  db.transaction(() => {
    if (replace) {
      // Only the sample rows go — anything already imported stays.
      db.prepare(`DELETE FROM colleges WHERE data_source = 'sample'`).run();
    }

    const collegeIdBySlug = new Map();

    const upsertCollege = (record) => {
      if (collegeIdBySlug.has(record.college_slug)) return collegeIdBySlug.get(record.college_slug);

      const city = cityByName.get(record.city);
      const payload = {
        slug: record.college_slug,
        name: record.college_name,
        shortName: record.short_name || record.college_name,
        city: record.city,
        state: record.state || city.state,
        regionGroup: record.region_group || city.regionGroup || null,
        ownership: record.ownership,
        establishedYear: numberOr(record.established_year),
        description: record.description || '',
        website: record.website || null,
        rating: numberOr(record.rating, 0),
        highestPackage: numberOr(record.highest_package_lpa, 0),
        avgPackage: numberOr(record.avg_package_lpa, 0),
        placementVerified: flag(record.placement_verified),
        accreditation: record.accreditation || null,
        campusSizeAcres: numberOr(record.campus_size_acres, null),
        latitude: numberOr(record.latitude, city.lat),
        longitude: numberOr(record.longitude, city.lng),
        // The column is CHECK'd to 0–359, so 360 has to fold back to 0.
        brandHue: Math.abs(Math.round(numberOr(record.brand_hue, city.hue ?? 20))) % 360,
        dataSource: record.data_source || 'csv',
      };

      const existing = db.prepare('SELECT id FROM colleges WHERE slug = ?').get(record.college_slug);
      let id;
      if (existing) {
        updateCollege.run(payload);
        id = existing.id;
        summary.updated += 1;
      } else {
        id = insertCollege.run(payload).lastInsertRowid;
        summary.colleges += 1;
      }

      collegeIdBySlug.set(record.college_slug, id);
      return id;
    };

    for (const record of records) {
      const collegeId = upsertCollege(record);
      const courseId = courseIdBySlug.get(record.course_slug);

      db.prepare(
        `INSERT OR REPLACE INTO college_courses
           (college_id, course_id, total_fees_inr, seats, eligibility, cutoff_note, cutoff_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        collegeId,
        courseId,
        numberOr(record.total_fees_inr, 0),
        numberOr(record.seats, null),
        record.eligibility || null,
        record.cutoff_note || null,
        numberOr(record.cutoff_value, null),
      );
      summary.courses += 1;

      for (const slug of (record.exam_slugs ?? '').split('|').map((item) => item.trim()).filter(Boolean)) {
        db.prepare('INSERT OR IGNORE INTO college_exams (college_id, exam_id) VALUES (?, ?)').run(
          collegeId,
          examIdBySlug.get(slug),
        );
        summary.links += 1;
      }
    }
  })();

  return summary;
}

export default importCsv;

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const replace = args.includes('--replace');
  const file = args.find((arg) => !arg.startsWith('--'));

  if (!file) {
    console.error('Usage: npm run import:csv -- <file.csv> [--replace]');
    process.exit(1);
  }

  try {
    const summary = importCsv(path.resolve(file), { replace });
    console.log(`[import] ${file}`);
    console.log(
      `[import] ${summary.colleges} new · ${summary.updated} updated · ${summary.courses} course rows · ${summary.links} exam links`,
    );
  } catch (error) {
    console.error(`[import] failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
}
