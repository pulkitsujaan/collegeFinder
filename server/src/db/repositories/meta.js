import { getDb } from '../connection.js';

/**
 * Everything the pickers need, in one request: courses, streams, cities,
 * states and exams, each with the number of colleges behind it.
 */
export function getMeta() {
  const db = getDb();

  const courses = db
    .prepare(
      `SELECT co.slug, co.name, co.stream, co.level, co.duration_years,
              COUNT(DISTINCT cc.college_id) AS count,
              MIN(cc.total_fees_inr) AS min_fees
       FROM courses co
       LEFT JOIN college_courses cc ON cc.course_id = co.id
       GROUP BY co.id
       ORDER BY count DESC, co.name`,
    )
    .all()
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      stream: row.stream,
      level: row.level,
      durationYears: row.duration_years,
      count: row.count,
      minFeesInr: row.min_fees,
    }));

  const streams = db
    .prepare(
      `SELECT co.stream AS stream, COUNT(DISTINCT cc.college_id) AS count
       FROM courses co
       LEFT JOIN college_courses cc ON cc.course_id = co.id
       GROUP BY co.stream
       ORDER BY count DESC, co.stream`,
    )
    .all();

  const cityRows = db
    .prepare(
      `SELECT city, state, region_group, COUNT(*) AS count FROM colleges
       GROUP BY city`,
    )
    .all();

  // Grouped markets (Delhi-NCR) are presented as one entry and their member
  // cities are folded into it, so the picker never double-counts.
  const regionMembers = new Map();
  for (const row of cityRows) {
    if (!row.region_group) continue;
    if (!regionMembers.has(row.region_group)) regionMembers.set(row.region_group, []);
    regionMembers.get(row.region_group).push(row.city);
  }

  const cities = [];
  for (const row of cityRows) {
    if (row.region_group) continue;
    cities.push({ value: row.city, label: row.city, state: row.state, count: row.count });
  }
  for (const [region, members] of regionMembers) {
    cities.push({
      value: region,
      label: region,
      state: null,
      count: cityRows
        .filter((row) => members.includes(row.city))
        .reduce((sum, row) => sum + row.count, 0),
      grouped: true,
      members,
    });
  }
  cities.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const states = db
    .prepare(
      `SELECT state, COUNT(*) AS count FROM colleges GROUP BY state ORDER BY count DESC, state`,
    )
    .all();

  const exams = db
    .prepare(
      `SELECT e.slug, e.name, e.stream, e.level, e.exam_date,
              COUNT(DISTINCT ce.college_id) AS count
       FROM exams e
       LEFT JOIN college_exams ce ON ce.exam_id = e.id
       GROUP BY e.id
       ORDER BY e.exam_date`,
    )
    .all()
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      stream: row.stream,
      level: row.level,
      examDate: row.exam_date,
      count: row.count,
    }));

  const ownership = db
    .prepare(`SELECT ownership, COUNT(*) AS count FROM colleges GROUP BY ownership`)
    .all();

  // Exam streams are their own vocabulary — the exams page filters on these,
  // not on course streams, so a chip can never lead to an empty list.
  const examStreams = db
    .prepare(
      `SELECT stream, COUNT(*) AS count FROM exams
       GROUP BY stream
       ORDER BY count DESC, stream`,
    )
    .all();

  return {
    courses,
    streams,
    cities,
    states,
    exams,
    examStreams,
    ownership,
    totals: {
      colleges: db.prepare('SELECT COUNT(*) AS n FROM colleges').get().n,
      courses: db.prepare('SELECT COUNT(*) AS n FROM courses').get().n,
      cities: new Set(cityRows.map((row) => row.city)).size,
      exams: db.prepare('SELECT COUNT(*) AS n FROM exams').get().n,
    },
  };
}
