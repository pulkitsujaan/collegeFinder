/**
 * Seeds the SQLite database from the JSON files in server/data/.
 *
 * Idempotent: schema.sql drops and recreates every table, and the whole load
 * runs inside a single transaction. Running it twice gives you the same
 * database, not twice the rows.
 *
 * ── About the numbers ──────────────────────────────────────────────────────
 * College identity — name, city, state, ownership, founding year, website —
 * comes from colleges.json and is real. Fees, packages, ratings, seat counts
 * and cut-offs are NOT. They are generated here from a seeded PRNG keyed on
 * the college slug, sitting inside ranges chosen to be plausible for the
 * college's tier and its flagship stream. Deterministic, so the same college
 * always shows the same numbers, and every row is stamped data_source:"sample".
 * ───────────────────────────────────────────────────────────────────────────
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../config.js';
import { getDb, applySchema, closeDb } from '../db/connection.js';

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/** FNV-1a — stable across runs and platforms, which Math.random is not. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough for plausible sample data. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng, min, max) => min + rng() * (max - min);
const roundTo = (value, step) => Math.round(value / step) * step;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// ---------------------------------------------------------------------------
// Generation tables
// ---------------------------------------------------------------------------

const RATING_BASE = { 1: 8.7, 2: 7.6, 3: 6.6 };
const SIZE_RANGE = { 1: [140, 620], 2: [40, 240], 3: [8, 90] };
const SEAT_FACTOR = { 1: 1.3, 2: 1.0, 3: 0.85 };
const ACCREDITATION = { 1: 'NAAC A++', 2: 'NAAC A+', 3: 'NAAC A' };
const ACCREDITATION_ALT = { 3: 'NAAC B++' };

/** Highest package (LPA) base by flagship stream and tier. */
const PACKAGE_BASE = {
  Engineering: { 1: 58, 2: 17, 3: 9.5 },
  Management: { 1: 46, 2: 19, 3: 11 },
  Computer: { 1: 42, 2: 15, 3: 9 },
  Medical: { 1: 24, 2: 14, 3: 10 },
  Dental: { 1: 12, 2: 9, 3: 7 },
  Law: { 1: 22, 2: 13, 3: 8 },
  Design: { 1: 19, 2: 11, 3: 7 },
  Science: { 1: 26, 2: 12, 3: 8 },
  Commerce: { 1: 18, 2: 11, 3: 7 },
  Arts: { 1: 15, 2: 9.5, 3: 6.5 },
  Architecture: { 1: 15, 2: 9, 3: 6 },
  'Hotel Management': { 1: 12, 2: 8, 3: 5.5 },
  Agriculture: { 1: 12, 2: 8, 3: 6 },
  Veterinary: { 1: 12, 2: 8, 3: 6 },
  Animation: { 1: 11, 2: 7.5, 3: 5.5 },
  Aviation: { 1: 14, 2: 9, 3: 6.5 },
};

/** Total course fee (INR) at a tier-2 private college, before multipliers. */
const FEE_BASE = {
  btech: 480000,
  mtech: 220000,
  barch: 520000,
  mba: 900000,
  bba: 360000,
  bcom: 150000,
  mcom: 120000,
  bca: 240000,
  mca: 200000,
  bsc: 180000,
  msc: 160000,
  ba: 110000,
  ma: 100000,
  mbbs: 7500000,
  bams: 1800000,
  bhms: 1400000,
  bds: 2600000,
  llb: 700000,
  llm: 250000,
  bdes: 800000,
  mdes: 400000,
  bhm: 400000,
  'bsc-agri': 320000,
  bvsc: 900000,
  'bsc-animation': 300000,
  'bsc-aviation': 500000,
  phd: 150000,
};

const SEAT_BASE = {
  btech: 120, mtech: 30, barch: 60, mba: 180, bba: 120, bcom: 120, mcom: 40,
  bca: 90, mca: 60, bsc: 80, msc: 40, ba: 100, ma: 40, mbbs: 100, bams: 100,
  bhms: 60, bds: 100, llb: 120, llm: 30, bdes: 40, mdes: 20, bhm: 60,
  'bsc-agri': 60, bvsc: 60, 'bsc-animation': 60, 'bsc-aviation': 60, phd: 15,
};

// Government fees are a fraction of private ones; medical seats are subsidised
// far more heavily than anything else, which is why they get their own number.
const OWNERSHIP_FEE_FACTOR = {
  Government: 0.3,
  Deemed: 0.8,
  Private: 1,
  Autonomous: 0.9,
};
const GOV_MEDICAL_FACTOR = 0.02;
const MEDICAL_STREAMS = new Set(['Medical', 'Dental', 'Veterinary']);
const TIER_FEE_FACTOR = { 1: 1.35, 2: 1, 3: 0.8 };

const ELIGIBILITY = {
  UG: '10+2 from a recognised board with the required subject combination and minimum aggregate marks.',
  PG: 'A relevant bachelor’s degree with the minimum aggregate marks required by the institute.',
  Diploma: '10+2 or an equivalent qualification from a recognised board.',
  Doctorate: 'A relevant master’s degree with a minimum aggregate, plus a valid research proposal and interview.',
};

const ELIGIBILITY_OVERRIDE = {
  btech: '10+2 with Physics, Chemistry and Mathematics. Admission through JEE Main or the relevant state test.',
  mbbs: '10+2 with Physics, Chemistry and Biology. Admission through NEET UG and centralised counselling.',
  bds: '10+2 with Physics, Chemistry and Biology. Admission through NEET UG.',
  bams: '10+2 with Physics, Chemistry and Biology. Admission through NEET UG.',
  bhms: '10+2 with Physics, Chemistry and Biology. Admission through NEET UG.',
  bvsc: '10+2 with Physics, Chemistry and Biology. Admission through NEET UG.',
  llb: '10+2 in any stream with the minimum aggregate. Admission through CLAT or the institute’s own test.',
  mba: 'A bachelor’s degree with at least 50% aggregate. Admission through CAT, XAT, CMAT, MAT or the institute’s own test.',
  barch: '10+2 with Mathematics, plus a valid NATA or JEE Main Paper 2 score.',
  bdes: '10+2 in any stream. Admission through UCEED, NID DAT, NIFT or the institute’s own design test.',
  bhm: '10+2 in any stream. Admission through NCHM JEE or the institute’s own test.',
  'bsc-agri': '10+2 with Physics, Chemistry and Biology or Mathematics. Admission through ICAR AIEEA or the state test.',
  bca: '10+2 in any stream, with Mathematics preferred.',
  mca: 'A bachelor’s degree with Mathematics at 10+2 or graduation level. Admission through NIMCET or the state test.',
  phd: 'A relevant master’s degree with a minimum aggregate, plus a valid GATE/NET score or an entrance interview.',
};

/** Cut-off shapes: how a competitive score for this course looks by tier. */
const CUTOFF_SHAPE = {
  btech: { unit: 'JEE Main percentile (general category)', t1: [99.2, 99.94], t2: [92, 98.6], t3: [70, 90] },
  mba: { unit: 'CAT percentile (general category)', t1: [94, 99.6], t2: [80, 92], t3: [60, 78] },
  mbbs: { unit: 'NEET UG score out of 720', t1: [655, 700], t2: [580, 650], t3: [480, 575] },
  bds: { unit: 'NEET UG score out of 720', t1: [600, 650], t2: [520, 595], t3: [420, 515] },
  bams: { unit: 'NEET UG score out of 720', t1: [580, 630], t2: [500, 575], t3: [400, 495] },
  bhms: { unit: 'NEET UG score out of 720', t1: [540, 600], t2: [460, 535], t3: [380, 455] },
  bvsc: { unit: 'NEET UG score out of 720', t1: [560, 620], t2: [470, 555], t3: [390, 465] },
  llb: { unit: 'CLAT score out of 120', t1: [95, 112], t2: [75, 92], t3: [50, 72] },
  barch: { unit: 'NATA score out of 200', t1: [140, 175], t2: [110, 138], t3: [70, 105] },
  bdes: { unit: 'UCEED score out of 300', t1: [150, 210], t2: [110, 145], t3: [70, 105] },
  bsc: { unit: 'IISER aptitude test / CUET score, institute-normalised', t1: [80, 96], t2: [62, 78], t3: [45, 60] },
  bcom: { unit: 'CUET score, institute-normalised', t1: [80, 95], t2: [60, 78], t3: [45, 58] },
  ba: { unit: 'CUET score, institute-normalised', t1: [78, 94], t2: [58, 76], t3: [42, 56] },
};

/** Which entrance exams a course implies, given who the college is. */
function examsForCourse(courseSlug, college, state) {
  const out = new Set();
  const isIIT = college.name.includes('Indian Institute of Technology');
  const isGovernment = college.ownership === 'Government';

  switch (courseSlug) {
    case 'btech':
      out.add('jee-main');
      if (isIIT) out.add('jee-advanced');
      if (state === 'Maharashtra') out.add('mht-cet');
      if (state === 'Karnataka') out.add('kcet');
      if (state === 'West Bengal') out.add('wbjee');
      if (college.slug.includes('bits-')) out.add('bitsat');
      if (college.slug.includes('vit-vellore')) out.add('viteee');
      if (college.slug.includes('srm-')) out.add('srmjeee');
      break;
    case 'barch':
      out.add('nata');
      out.add('jee-main');
      break;
    case 'mtech':
      out.add('gate');
      break;
    case 'phd':
      out.add('gate');
      break;
    case 'mba':
      out.add('cat');
      if (college.tier <= 2) out.add('xat');
      if (college.tier === 3) { out.add('cmat'); out.add('mat'); }
      if (college.slug.includes('symbiosis')) out.add('snap');
      if (college.slug.includes('nmims')) out.add('nmat');
      break;
    case 'bba':
    case 'bcom':
    case 'bsc':
    case 'ba':
      if (isGovernment) out.add('cuet-ug');
      break;
    case 'ma':
      if (isGovernment) out.add('cuet-ug');
      break;
    case 'mca':
      if (college.name.includes('National Institute of Technology')) out.add('nimcet');
      break;
    case 'mbbs':
    case 'bams':
    case 'bhms':
    case 'bds':
    case 'bvsc':
      out.add('neet-ug');
      break;
    case 'llb':
    case 'llm':
      out.add('clat');
      break;
    case 'bdes':
      if (isIIT) out.add('uceed');
      else { out.add('nid-dat'); out.add('nift'); }
      break;
    case 'mdes':
      out.add('uceed');
      break;
    case 'bhm':
      out.add('nchmct-jee');
      break;
    case 'bsc-agri':
      out.add('icar-aieea');
      break;
    default:
      break;
  }

  return [...out];
}

// ---------------------------------------------------------------------------
// Date handling — exam dates are stored as month/day plus a year offset so the
// calendar stays sensible whenever the seed is run.
// ---------------------------------------------------------------------------

const BASE_YEAR = new Date().getFullYear();

function isoDate(spec) {
  if (!spec) return null;
  const year = BASE_YEAR + (spec.yearOffset ?? 0);
  return `${year}-${String(spec.month).padStart(2, '0')}-${String(spec.day).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Loading + main
// ---------------------------------------------------------------------------

const ENGLISH_ARTICLE = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(config.seedDataDir, file), 'utf8'));
}

function buildDescription(college) {
  const { blurb, establishedYear, shortName, ownership, city, state } = college;
  const opener = blurb.endsWith('.') ? blurb : `${blurb}.`;
  const ownershipPhrase = ownership.toLowerCase();
  const parts = [
    opener,
    `Established in ${establishedYear}, ${shortName} is ${ENGLISH_ARTICLE(ownershipPhrase)} ${ownershipPhrase} institution in ${city}, ${state}.`,
  ];
  if (college.accreditation === 'Institute of National Importance') {
    parts.push('It is designated an Institute of National Importance by an Act of Parliament.');
  }
  parts.push(
    `This listing covers ${college.courseNames.length} programme${college.courseNames.length === 1 ? '' : 's'}: ${college.courseNames.join(', ')}.`,
  );
  return parts.join(' ');
}

function seed() {
  const startedAt = Date.now();
  const db = getDb();

  const colleges = readJson('colleges.json');
  const courses = readJson('courses.json');
  const exams = readJson('exams.json');
  const facilities = readJson('facilities.json');
  const cities = readJson('cities.json');

  const cityByName = new Map(cities.map((city) => [city.name, city]));
  const courseBySlug = new Map(courses.map((course) => [course.slug, course]));

  // Fail loudly on a typo rather than silently inserting a college with no city.
  for (const college of colleges) {
    if (!cityByName.has(college.city)) {
      throw new Error(`colleges.json: "${college.slug}" refers to unknown city "${college.city}"`);
    }
    for (const slug of college.courses) {
      if (!courseBySlug.has(slug)) {
        throw new Error(`colleges.json: "${college.slug}" refers to unknown course "${slug}"`);
      }
    }
  }

  applySchema(db);

  const insertCollege = db.prepare(`
    INSERT INTO colleges (
      slug, name, short_name, city, state, region_group, ownership, established_year,
      description, website, rating, highest_package_lpa, avg_package_lpa, placement_verified,
      accreditation, campus_size_acres, latitude, longitude, brand_hue, data_source
    ) VALUES (
      @slug, @name, @shortName, @city, @state, @regionGroup, @ownership, @establishedYear,
      @description, @website, @rating, @highestPackage, @avgPackage, @placementVerified,
      @accreditation, @campusSizeAcres, @latitude, @longitude, @brandHue, 'sample'
    )
  `);

  const insertCourse = db.prepare(`
    INSERT INTO courses (slug, name, stream, level, duration_years)
    VALUES (@slug, @name, @stream, @level, @durationYears)
  `);

  const insertCollegeCourse = db.prepare(`
    INSERT INTO college_courses (
      college_id, course_id, total_fees_inr, seats, eligibility, cutoff_note, cutoff_value
    ) VALUES (
      @collegeId, @courseId, @totalFees, @seats, @eligibility, @cutoffNote, @cutoffValue
    )
  `);

  const insertExam = db.prepare(`
    INSERT INTO exams (
      slug, name, full_name, stream, level, mode,
      application_start, exam_date, result_date, description, data_source
    ) VALUES (
      @slug, @name, @fullName, @stream, @level, @mode,
      @applicationStart, @examDate, @resultDate, @description, 'sample'
    )
  `);

  const insertFacility = db.prepare(`
    INSERT INTO facilities (slug, name, icon_key) VALUES (@slug, @name, @iconKey)
  `);

  const insertCollegeExam = db.prepare(`
    INSERT OR IGNORE INTO college_exams (college_id, exam_id) VALUES (?, ?)
  `);

  const insertCollegeFacility = db.prepare(`
    INSERT OR IGNORE INTO college_facilities (college_id, facility_id) VALUES (?, ?)
  `);

  const summary = { colleges: 0, courses: 0, collegeCourses: 0, exams: 0, links: 0 };

  const run = db.transaction(() => {
    // Courses -----------------------------------------------------------------
    const courseIdBySlug = new Map();
    for (const course of courses) {
      const info = insertCourse.run(course);
      courseIdBySlug.set(course.slug, info.lastInsertRowid);
    }
    summary.courses = courses.length;

    // Exams -------------------------------------------------------------------
    const examIdBySlug = new Map();
    for (const exam of exams) {
      const info = insertExam.run({
        slug: exam.slug,
        name: exam.name,
        fullName: exam.fullName,
        stream: exam.stream,
        level: exam.level,
        mode: exam.mode,
        applicationStart: isoDate(exam.applicationStart),
        examDate: isoDate(exam.examDate),
        resultDate: isoDate(exam.resultDate),
        description: exam.description,
      });
      examIdBySlug.set(exam.slug, info.lastInsertRowid);
    }
    summary.exams = exams.length;

    // Facilities --------------------------------------------------------------
    const facilityIdBySlug = new Map();
    facilities.forEach((facility) => {
      const info = insertFacility.run(facility);
      facilityIdBySlug.set(facility.slug, info.lastInsertRowid);
    });

    // Colleges ----------------------------------------------------------------
    for (const college of colleges) {
      const city = cityByName.get(college.city);
      const rng = makeRng(hash(college.slug));
      const tier = college.tier;
      const courseDocs = college.courses.map((slug) => courseBySlug.get(slug));
      const flagship = courseDocs[0];

      college.courseNames = courseDocs.map((course) => course.name);

      // Rating: pulled towards the tier's centre, then jittered.
      const rating = Number(clamp(RATING_BASE[tier] + between(rng, -0.35, 0.35), 5.8, 9.9).toFixed(1));

      // Packages: the flagship stream sets the shape, the tier sets the level.
      const packageBase = PACKAGE_BASE[flagship.stream] ?? PACKAGE_BASE.Science;
      const highestPackage = Number(roundTo(packageBase[tier] * between(rng, 0.75, 1.55), 0.5).toFixed(1));
      const avgPackage = Number((highestPackage * between(rng, 0.34, 0.54)).toFixed(1));

      const placementVerified =
        tier === 1 ? 1 : rng() < (tier === 2 ? 0.65 : 0.32) ? 1 : 0;

      const [minAcres, maxAcres] = SIZE_RANGE[tier];
      const campusSizeAcres = Math.round(between(rng, minAcres, maxAcres));

      const accreditation =
        college.accreditation ??
        (tier === 3 && rng() < 0.45 ? ACCREDITATION_ALT[3] : ACCREDITATION[tier]);

      // Covers are generated from this hue, so a city reads as a colour family
      // and each college inside it gets its own variation.
      const brandHue = (city.hue + Math.round(between(rng, -22, 22)) + 360) % 360;

      const description = buildDescription(college);

      const collegeInfo = insertCollege.run({
        slug: college.slug,
        name: college.name,
        shortName: college.shortName,
        city: college.city,
        state: city.state,
        regionGroup: city.regionGroup ?? null,
        ownership: college.ownership,
        establishedYear: college.establishedYear,
        description,
        website: college.website ?? null,
        rating,
        highestPackage,
        avgPackage,
        placementVerified,
        accreditation,
        campusSizeAcres,
        latitude: city.lat,
        longitude: city.lng,
        brandHue,
      });

      const collegeId = collegeInfo.lastInsertRowid;
      summary.colleges += 1;

      // Courses & fees --------------------------------------------------------
      for (const course of courseDocs) {
        const feeBase = FEE_BASE[course.slug] ?? 250000;
        let ownershipFactor = OWNERSHIP_FEE_FACTOR[college.ownership];
        if (college.ownership === 'Government' && MEDICAL_STREAMS.has(course.stream)) {
          ownershipFactor = GOV_MEDICAL_FACTOR;
        }
        const jitter = between(rng, 0.82, 1.22);
        const totalFees = roundTo(feeBase * ownershipFactor * TIER_FEE_FACTOR[tier] * jitter, 500);

        const seatBase = SEAT_BASE[course.slug] ?? 60;
        const seats = roundTo(seatBase * SEAT_FACTOR[tier] * between(rng, 0.7, 1.35), 10);

        const shape = CUTOFF_SHAPE[course.slug];
        let cutoffValue = null;
        let cutoffNote = null;
        if (shape) {
          const [low, high] = shape[tier === 1 ? 't1' : tier === 2 ? 't2' : 't3'];
          cutoffValue = Number(between(rng, low, high).toFixed(2));
          cutoffNote = `${shape.unit}. Illustrative cut-off for this prototype, not the current year's official figure.`;
        }

        insertCollegeCourse.run({
          collegeId,
          courseId: courseIdBySlug.get(course.slug),
          totalFees,
          seats,
          eligibility: ELIGIBILITY_OVERRIDE[course.slug] ?? ELIGIBILITY[course.level],
          cutoffNote,
          cutoffValue,
        });
        summary.collegeCourses += 1;

        // Exam links come from the course, adjusted for who the college is.
        for (const examSlug of examsForCourse(course.slug, college, city.state)) {
          const examId = examIdBySlug.get(examSlug);
          if (examId) {
            insertCollegeExam.run(collegeId, examId);
            summary.links += 1;
          }
        }
      }

      // Facilities ------------------------------------------------------------
      // Higher tiers get more of the list; library, canteen and Wi-Fi are
      // treated as baseline and always included.
      const always = new Set(['library', 'canteen', 'wifi']);
      const facilityCount = tier === 1 ? facilities.length : tier === 2 ? Math.round(between(rng, 10, 13)) : Math.round(between(rng, 6, 11));
      let added = 0;
      for (const facility of facilities) {
        if (added >= facilityCount) break;
        if (always.has(facility.slug) || rng() < 0.82) {
          insertCollegeFacility.run(collegeId, facilityIdBySlug.get(facility.slug));
          added += 1;
        }
      }
    }
  });

  run();

  const elapsed = Date.now() - startedAt;
  console.log('[seed] database:', config.databaseFile);
  console.log(
    `[seed] ${summary.colleges} colleges · ${summary.courses} courses · ${summary.collegeCourses} college-course rows · ${summary.exams} exams · ${summary.links} college-exam links`,
  );
  console.log(`[seed] done in ${elapsed}ms (all values marked data_source="sample")`);
  closeDb();
}

export { seed };

// Only run when invoked as a script (`npm run seed`), so tests can import the
// function and point it at their own database file.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) seed();
