import { getDb } from '../connection.js';
import { buildFilters, feeSortExpression } from './filters.js';

/** Row → API shape. Money stays an integer INR; packages stay LPA numbers. */
export function mapCollege(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    city: row.city,
    state: row.state,
    regionGroup: row.region_group,
    ownership: row.ownership,
    establishedYear: row.established_year,
    rating: row.rating,
    highestPackageLpa: row.highest_package_lpa,
    avgPackageLpa: row.avg_package_lpa,
    placementVerified: Boolean(row.placement_verified),
    accreditation: row.accreditation,
    campusSizeAcres: row.campus_size_acres,
    brandHue: row.brand_hue,
    dataSource: row.data_source,
  };
}

const LIST_COLUMNS = `
  c.id, c.slug, c.name, c.short_name, c.city, c.state, c.region_group, c.ownership,
  c.established_year, c.rating, c.highest_package_lpa, c.avg_package_lpa,
  c.placement_verified, c.accreditation, c.campus_size_acres, c.brand_hue, c.data_source,
  (SELECT MIN(f.total_fees_inr) FROM college_courses f WHERE f.college_id = c.id) AS min_fees,
  (SELECT group_concat(t.name, '||') FROM (
      SELECT co.name AS name FROM college_courses cc
      JOIN courses co ON co.id = cc.course_id
      WHERE cc.college_id = c.id ORDER BY co.id LIMIT 4
   ) t) AS course_names
`;

/** Search params may arrive as a single value or an array (comma-split upstream). */
const withFeeScope = (input) => {
  const courses = Array.isArray(input.course) ? input.course : input.course ? [input.course] : [];
  return { courses, feeExpr: feeSortExpression(courses) };
};

function orderClause(sort, input) {
  const { feeExpr } = withFeeScope(input);
  const q = (input.q ?? '').trim();

  switch (sort) {
    case 'rating':
      return { sql: 'ORDER BY c.rating DESC, c.name COLLATE NOCASE ASC', params: [] };
    case 'highest_package':
      return { sql: 'ORDER BY c.highest_package_lpa DESC, c.rating DESC', params: [] };
    case 'avg_package':
      return { sql: 'ORDER BY c.avg_package_lpa DESC, c.rating DESC', params: [] };
    case 'fees_asc':
      return {
        sql: `ORDER BY ${feeExpr} IS NULL, ${feeExpr} ASC, c.name COLLATE NOCASE ASC`,
        params: withFeeScope(input).courses,
      };
    case 'fees_desc':
      return {
        sql: `ORDER BY ${feeExpr} IS NULL, ${feeExpr} DESC, c.name COLLATE NOCASE ASC`,
        params: withFeeScope(input).courses,
      };
    case 'name':
      return { sql: 'ORDER BY c.name COLLATE NOCASE ASC', params: [] };
    case 'relevance':
    default: {
      if (!q) return { sql: 'ORDER BY c.rating DESC, c.name COLLATE NOCASE ASC', params: [] };
      // Exact-ish matches first, then rating. Cheap, but it makes typing
      // "iit delhi" put IIT Delhi on top rather than the tenth IIT.
      const like = `${q}%`;
      return {
        sql: `ORDER BY
                CASE
                  WHEN c.name LIKE ? THEN 0
                  WHEN c.short_name LIKE ? THEN 1
                  WHEN c.city LIKE ? THEN 2
                  ELSE 3
                END,
                c.rating DESC,
                c.name COLLATE NOCASE ASC`,
        params: [like, like, like],
      };
    }
  }
}

export function searchColleges(input) {
  const db = getDb();
  const { where, params } = buildFilters(input);
  const order = orderClause(input.sort, input);

  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 12;
  const offset = (page - 1) * pageSize;

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM colleges c ${where}`)
    .get(...params).n;

  const rows = db
    .prepare(
      `SELECT ${LIST_COLUMNS}
       FROM colleges c
       ${where}
       ${order.sql}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, ...order.params, pageSize, offset);

  return {
    items: rows.map((row) => ({
      ...mapCollege(row),
      courseNames: row.course_names ? row.course_names.split('||') : [],
      minFeesInr: row.min_fees,
    })),
    total,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

/** The four ownership values the UI offers, in the order it shows them. */
const OWNERSHIP_VALUES = ['Government', 'Private', 'Deemed', 'Autonomous'];

/**
 * Seeds a facet map with the full vocabulary, then overlays the real counts.
 *
 * A plain GROUP BY only emits options that matched, so applying one filter makes
 * unrelated options disappear — which reads as a bug and hides what the filter
 * did. Every option comes back instead, at 0 where nothing matched; the panel
 * dims those rather than hiding them.
 */
function withZeroDefaults(counts, values) {
  const out = new Map(values.map((value) => [value, 0]));
  for (const [value, count] of counts) out.set(value, count);
  return out;
}

/** Runs one COUNT-per-option query with the other dimensions still applied. */
function countBy(db, groupSql, input, excludeKey, extraWhere = '') {
  const { where, params } = buildFilters(input, new Set([excludeKey]));
  const sql = `
    SELECT ${groupSql} AS value, COUNT(DISTINCT c.id) AS count
    FROM colleges c
    ${where}
    ${extraWhere}
    GROUP BY value
  `;
  const rows = db.prepare(sql).all(...params);
  return new Map(rows.filter((row) => row.value != null).map((row) => [row.value, row.count]));
}

export function getFacets(input) {
  const db = getDb();

  // The vocabularies each facet is seeded with. Course, stream and exam are
  // closed lists that the pickers always show in full; city and state come from
  // the data itself, so the universe is every city and state that exists.
  const vocab = {
    courses: db
      .prepare('SELECT slug FROM courses ORDER BY id')
      .all()
      .map((row) => row.slug),
    streams: db
      .prepare('SELECT DISTINCT stream FROM courses ORDER BY stream')
      .all()
      .map((row) => row.stream),
    cities: db
      .prepare('SELECT DISTINCT city FROM colleges ORDER BY city')
      .all()
      .map((row) => row.city),
    states: db
      .prepare('SELECT DISTINCT state FROM colleges ORDER BY state')
      .all()
      .map((row) => row.state),
    exams: db
      .prepare('SELECT slug FROM exams ORDER BY id')
      .all()
      .map((row) => row.slug),
  };

  // Course facet counts every course a college offers, not just its flagship.
  const courseFacet = (() => {
    const { where, params } = buildFilters(input, new Set(['course']));
    const rows = db
      .prepare(
        `SELECT co.slug AS value, COUNT(DISTINCT c.id) AS count
         FROM colleges c
         JOIN college_courses cc ON cc.college_id = c.id
         JOIN courses co ON co.id = cc.course_id
         ${where}
         GROUP BY co.slug`,
      )
      .all(...params);
    return withZeroDefaults(new Map(rows.map((row) => [row.value, row.count])), vocab.courses);
  })();

  const streamCounts = (() => {
    const { where, params } = buildFilters(input, new Set(['stream']));
    const rows = db
      .prepare(
        `SELECT co.stream AS value, COUNT(DISTINCT c.id) AS count
         FROM colleges c
         JOIN college_courses cc ON cc.college_id = c.id
         JOIN courses co ON co.id = cc.course_id
         ${where}
         GROUP BY co.stream`,
      )
      .all(...params);
    return withZeroDefaults(new Map(rows.map((row) => [row.value, row.count])), vocab.streams);
  })();

  const cityCounts = countBy(db, 'c.city', input, 'city');
  const stateCounts = withZeroDefaults(countBy(db, 'c.state', input, 'state'), vocab.states);
  const ownershipCounts = withZeroDefaults(
    countBy(db, 'c.ownership', input, 'ownership'),
    OWNERSHIP_VALUES,
  );

  // Delhi-NCR and friends are offered as one grouped option, and their member
  // cities are removed from the list so nothing is counted twice.
  const regionRows = db
    .prepare(
      `SELECT DISTINCT region_group AS region, city FROM colleges WHERE region_group IS NOT NULL`,
    )
    .all();
  const regionMembers = new Map();
  for (const row of regionRows) {
    if (!regionMembers.has(row.region)) regionMembers.set(row.region, []);
    regionMembers.get(row.region).push(row.city);
  }
  const groupedCities = new Set(regionRows.map((row) => row.city));

  const cityOptions = [];
  for (const city of vocab.cities) {
    if (groupedCities.has(city)) continue;
    cityOptions.push({ value: city, label: city, count: cityCounts.get(city) ?? 0 });
  }
  for (const [region, members] of regionMembers) {
    const count = members.reduce((sum, city) => sum + (cityCounts.get(city) ?? 0), 0);
    cityOptions.push({ value: region, label: region, count, grouped: members.length > 1 });
  }
  cityOptions.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const examCounts = (() => {
    const { where, params } = buildFilters(input, new Set(['exam']));
    const rows = db
      .prepare(
        `SELECT e.slug AS value, COUNT(DISTINCT c.id) AS count
         FROM colleges c
         JOIN college_exams ce ON ce.college_id = c.id
         JOIN exams e ON e.id = ce.exam_id
         ${where}
         GROUP BY e.slug`,
      )
      .all(...params);
    return withZeroDefaults(new Map(rows.map((row) => [row.value, row.count])), vocab.exams);
  })();

  const ratingCounts = (() => {
    const { where, params } = buildFilters(input, new Set(['minRating']));
    const buckets = [7, 8, 9];
    const out = new Map();
    for (const bucket of buckets) {
      const row = db
        .prepare(`SELECT COUNT(*) AS n FROM colleges c ${where ? `${where} AND` : 'WHERE'} c.rating >= ?`)
        .get(...params, bucket);
      out.set(bucket, row.n);
    }
    return out;
  })();

  const placementVerifiedCount = (() => {
    const { where, params } = buildFilters(input, new Set(['placementVerified']));
    const row = db
      .prepare(
        `SELECT COUNT(*) AS n FROM colleges c ${where ? `${where} AND` : 'WHERE'} c.placement_verified = 1`,
      )
      .get(...params);
    return row.n;
  })();

  // Ranges come from the unfiltered dataset so the sliders never jump around
  // while the user drags them.
  const ranges = db
    .prepare(
      `SELECT
         (SELECT MIN(total_fees_inr) FROM college_courses) AS minFees,
         (SELECT MAX(total_fees_inr) FROM college_courses) AS maxFees,
         (SELECT MIN(highest_package_lpa) FROM colleges) AS minHighestPackage,
         (SELECT MAX(highest_package_lpa) FROM colleges) AS maxHighestPackage,
         (SELECT MIN(avg_package_lpa) FROM colleges) AS minAvgPackage,
         (SELECT MAX(avg_package_lpa) FROM colleges) AS maxAvgPackage,
         (SELECT MIN(established_year) FROM colleges) AS minEstablished,
         (SELECT MAX(established_year) FROM colleges) AS maxEstablished`,
    )
    .get();

  return {
    course: courseFacet,
    stream: streamCounts,
    city: cityOptions,
    state: stateCounts,
    ownership: ownershipCounts,
    exam: examCounts,
    rating: ratingCounts,
    placementVerified: placementVerifiedCount,
    ranges,
  };
}

// ---------------------------------------------------------------------------
// Suggest, detail, similar, compare, rankings
// ---------------------------------------------------------------------------

export function suggest(query, limit = 8) {
  const db = getDb();
  const q = query.trim();
  if (!q) return [];
  const like = `%${q}%`;
  const prefix = `${q}%`;

  const colleges = db
    .prepare(
      `SELECT c.name AS label, c.slug AS slug, c.city AS city, c.state AS state, c.rating AS rating
       FROM colleges c
       WHERE c.name LIKE ? OR c.short_name LIKE ?
       ORDER BY CASE WHEN c.name LIKE ? THEN 0 ELSE 1 END, c.rating DESC
       LIMIT ?`,
    )
    .all(like, like, prefix, limit)
    .map((row) => ({
      type: 'college',
      label: row.label,
      slug: row.slug,
      sublabel: `${row.city}, ${row.state}`,
      rating: row.rating,
      href: `/college/${row.slug}`,
    }));

  const cities = db
    .prepare(
      `SELECT c.city AS label, COUNT(*) AS count FROM colleges c
       WHERE c.city LIKE ?
       GROUP BY c.city ORDER BY count DESC LIMIT ?`,
    )
    .all(like, limit)
    .map((row) => ({
      type: 'city',
      label: row.label,
      count: row.count,
      sublabel: `${row.count} college${row.count === 1 ? '' : 's'}`,
      href: `/colleges?city=${encodeURIComponent(row.label)}`,
    }));

  const courses = db
    .prepare(
      `SELECT co.slug, co.name AS label, co.stream FROM courses co
       WHERE co.name LIKE ? OR co.stream LIKE ?
       ORDER BY co.id LIMIT ?`,
    )
    .all(like, like, limit)
    .map((row) => ({
      type: 'course',
      label: row.label,
      slug: row.slug,
      sublabel: row.stream,
      href: `/colleges?course=${encodeURIComponent(row.slug)}`,
    }));

  // Interleave so a query like "pune" doesn't return eight colleges and hide
  // the city shortcut underneath them.
  const groups = [cities, courses, colleges];
  const mixed = [];
  for (let i = 0; mixed.length < limit && i < limit; i += 1) {
    for (const group of groups) {
      if (group[i] && mixed.length < limit) mixed.push(group[i]);
    }
  }
  return mixed;
}

export function getCollegeBySlug(slug) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM colleges WHERE slug = ?').get(slug);
  if (!row) return null;

  const college = mapCollege(row);
  college.description = row.description;
  college.website = row.website;
  college.latitude = row.latitude;
  college.longitude = row.longitude;
  college.regionGroup = row.region_group;
  college.regionGroupLabel = row.region_group;

  college.courses = db
    .prepare(
      `SELECT co.id, co.slug, co.name, co.stream, co.level, co.duration_years,
              cc.total_fees_inr, cc.seats, cc.eligibility, cc.cutoff_note, cc.cutoff_value
       FROM college_courses cc
       JOIN courses co ON co.id = cc.course_id
       WHERE cc.college_id = ?
       ORDER BY cc.total_fees_inr ASC`,
    )
    .all(row.id)
    .map((course) => ({
      id: course.id,
      slug: course.slug,
      name: course.name,
      stream: course.stream,
      level: course.level,
      durationYears: course.duration_years,
      totalFeesInr: course.total_fees_inr,
      seats: course.seats,
      eligibility: course.eligibility,
      cutoffNote: course.cutoff_note,
      cutoffValue: course.cutoff_value,
    }));

  college.exams = db
    .prepare(
      `SELECT e.id, e.slug, e.name, e.full_name, e.stream, e.level, e.exam_date, e.result_date
       FROM college_exams ce
       JOIN exams e ON e.id = ce.exam_id
       WHERE ce.college_id = ?
       ORDER BY e.name`,
    )
    .all(row.id)
    .map((exam) => ({
      id: exam.id,
      slug: exam.slug,
      name: exam.name,
      fullName: exam.full_name,
      stream: exam.stream,
      level: exam.level,
      examDate: exam.exam_date,
      resultDate: exam.result_date,
    }));

  college.facilities = db
    .prepare(
      `SELECT f.slug, f.name, f.icon_key
       FROM college_facilities cf
       JOIN facilities f ON f.id = cf.facility_id
       WHERE cf.college_id = ?
       ORDER BY f.id`,
    )
    .all(row.id)
    .map((facility) => ({ slug: facility.slug, name: facility.name, iconKey: facility.icon_key }));

  college.feeRange = college.courses.length
    ? {
        min: Math.min(...college.courses.map((course) => course.totalFeesInr)),
        max: Math.max(...college.courses.map((course) => course.totalFeesInr)),
      }
    : null;

  college.similar = getSimilar(row, 4);
  return college;
}

/**
 * Similar colleges: same city or state first, then same flagship stream,
 * ordered by how close the rating is.
 */
function getSimilar(row, limit) {
  const db = getDb();
  return db
    .prepare(
      `SELECT ${LIST_COLUMNS}
       FROM colleges c
       WHERE c.id != ?
         AND (
           c.city = ?
           OR c.state = ?
           OR EXISTS (
             SELECT 1 FROM college_courses cc
             JOIN courses co ON co.id = cc.course_id
             WHERE cc.college_id = c.id
               AND co.stream IN (
                 SELECT co2.stream FROM college_courses cc2
                 JOIN courses co2 ON co2.id = cc2.course_id
                 WHERE cc2.college_id = ?
               )
           )
         )
       ORDER BY
         CASE WHEN c.city = ? THEN 0 WHEN c.state = ? THEN 1 ELSE 2 END,
         ABS(c.rating - ?) ASC,
         c.rating DESC
       LIMIT ?`,
    )
    .all(row.id, row.city, row.state, row.id, row.city, row.state, row.rating, limit)
    .map((similar) => ({
      ...mapCollege(similar),
      courseNames: similar.course_names ? similar.course_names.split('||') : [],
      minFeesInr: similar.min_fees,
    }));
}

// ---------------------------------------------------------------------------

export function getCompare(slugs) {
  const db = getDb();
  return slugs.map((slug) => {
    const row = db.prepare('SELECT * FROM colleges WHERE slug = ?').get(slug);
    if (!row) return { slug, missing: true };

    const college = mapCollege(row);
    college.description = row.description;
    college.website = row.website;
    college.courses = db
      .prepare(
        `SELECT co.name, co.level, co.duration_years, cc.total_fees_inr, cc.seats, cc.cutoff_value
         FROM college_courses cc JOIN courses co ON co.id = cc.course_id
         WHERE cc.college_id = ? ORDER BY cc.total_fees_inr ASC`,
      )
      .all(row.id)
      .map((course) => ({
        name: course.name,
        level: course.level,
        durationYears: course.duration_years,
        totalFeesInr: course.total_fees_inr,
        seats: course.seats,
        cutoffValue: course.cutoff_value,
      }));
    college.exams = db
      .prepare(
        `SELECT e.name FROM college_exams ce JOIN exams e ON e.id = ce.exam_id
         WHERE ce.college_id = ? ORDER BY e.name`,
      )
      .all(row.id)
      .map((exam) => exam.name);
    college.facilityCount = db
      .prepare('SELECT COUNT(*) AS n FROM college_facilities WHERE college_id = ?')
      .get(row.id).n;
    college.feeRange = college.courses.length
      ? {
          min: Math.min(...college.courses.map((course) => course.totalFeesInr)),
          max: Math.max(...college.courses.map((course) => course.totalFeesInr)),
        }
      : null;
    return college;
  });
}

/**
 * Student-choice ranking score.
 *
 *   score = rating × 6  +  min(avg_package_lpa, 30) × 1.2  +  min(highest_package_lpa, 60) × 0.35
 *
 * Rating is out of 10 and carries the most weight because it is the broadest
 * signal; average package is capped at 30 LPA so one outlier placement cannot
 * drag an otherwise ordinary college to the top, and the highest package is
 * capped and weighted lightly for the same reason. Placement-verified colleges
 * get a 3% nudge.
 */
export function rankingScore(row) {
  const avg = Math.min(row.avg_package_lpa ?? 0, 30);
  const highest = Math.min(row.highest_package_lpa ?? 0, 60);
  const base = row.rating * 6 + avg * 1.2 + highest * 0.35;
  return Number((base * (row.placement_verified ? 1.03 : 1)).toFixed(2));
}

export function getRankings({ course, limit = 20 }) {
  const db = getDb();
  const { where, params } = buildFilters({ course: course ? [course] : [] });
  const rows = db
    .prepare(`SELECT ${LIST_COLUMNS} FROM colleges c ${where}`)
    .all(...params);

  return rows
    .map((row) => ({
      ...mapCollege(row),
      courseNames: row.course_names ? row.course_names.split('||') : [],
      minFeesInr: row.min_fees,
      score: rankingScore(row),
      breakdown: {
        rating: row.rating,
        avgPackageLpa: row.avg_package_lpa,
        highestPackageLpa: row.highest_package_lpa,
        placementVerified: Boolean(row.placement_verified),
      },
    }))
    .sort((a, b) => b.score - a.score || b.rating - a.rating)
    .slice(0, limit);
}

export function getAllSlugs() {
  return getDb()
    .prepare('SELECT slug FROM colleges ORDER BY slug')
    .all()
    .map((row) => row.slug);
}

export function countColleges() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM colleges').get().n;
}
