/**
 * Builds the WHERE clause shared by the listing, facet and count queries.
 *
 * Every value is bound as a parameter — nothing is interpolated into SQL.
 * `exclude` lets the facet endpoint drop one dimension at a time, which is what
 * makes "Pune (14)" mean "14 results if you also picked Pune".
 */

export const SORTS = {
  relevance: 'relevance',
  rating: 'rating',
  highest_package: 'highest_package',
  avg_package: 'avg_package',
  fees_asc: 'fees_asc',
  fees_desc: 'fees_desc',
  name: 'name',
};

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== '' && item != null);
  if (value === '' || value == null) return [];
  return [value];
};

const placeholders = (values) => values.map(() => '?').join(', ');

/**
 * @param {object} input  validated query params
 * @param {Set<string>} exclude  dimensions whose own filter should be ignored
 * @returns {{ where: string, params: unknown[], joins: string }}
 */
export function buildFilters(input, exclude = new Set()) {
  const clauses = [];
  const params = [];

  const push = (sql, ...values) => {
    clauses.push(sql);
    params.push(...values);
  };

  // Free text across name, short name, city, state and course names.
  const q = (input.q ?? '').trim();
  if (q && !exclude.has('q')) {
    const like = `%${q}%`;
    push(
      `(
        c.name LIKE ? OR c.short_name LIKE ? OR c.city LIKE ? OR c.state LIKE ?
        OR EXISTS (
          SELECT 1 FROM college_courses sc
          JOIN courses sco ON sco.id = sc.course_id
          WHERE sc.college_id = c.id AND sco.name LIKE ?
        )
      )`,
      like,
      like,
      like,
      like,
      like,
    );
  }

  const courses = asArray(input.course);
  if (courses.length && !exclude.has('course')) {
    push(
      `EXISTS (
        SELECT 1 FROM college_courses cc
        JOIN courses co ON co.id = cc.course_id
        WHERE cc.college_id = c.id AND co.slug IN (${placeholders(courses)})
      )`,
      ...courses,
    );
  }

  const streams = asArray(input.stream);
  if (streams.length && !exclude.has('stream')) {
    push(
      `EXISTS (
        SELECT 1 FROM college_courses sc2
        JOIN courses sco2 ON sco2.id = sc2.course_id
        WHERE sc2.college_id = c.id AND sco2.stream IN (${placeholders(streams)})
      )`,
      ...streams,
    );
  }

  // City options can be a city ("Pune") or a grouped market ("Delhi-NCR"),
  // which matches on region_group instead.
  const cities = asArray(input.city);
  if (cities.length && !exclude.has('city')) {
    push(
      `(c.city IN (${placeholders(cities)}) OR c.region_group IN (${placeholders(cities)}))`,
      ...cities,
      ...cities,
    );
  }

  const states = asArray(input.state);
  if (states.length && !exclude.has('state')) {
    push(`c.state IN (${placeholders(states)})`, ...states);
  }

  const ownership = asArray(input.ownership);
  if (ownership.length && !exclude.has('ownership')) {
    push(`c.ownership IN (${placeholders(ownership)})`, ...ownership);
  }

  const exams = asArray(input.exam);
  if (exams.length && !exclude.has('exam')) {
    push(
      `EXISTS (
        SELECT 1 FROM college_exams ce
        JOIN exams e ON e.id = ce.exam_id
        WHERE ce.college_id = c.id AND e.slug IN (${placeholders(exams)})
      )`,
      ...exams,
    );
  }

  if (input.minRating != null && !exclude.has('minRating')) {
    push('c.rating >= ?', input.minRating);
  }

  // Fee range applies to the college's courses — and, when a course filter is
  // active, only to those courses. "B.Tech under ₹2 lakh" should mean exactly that.
  const hasFeeFilter = input.minFees != null || input.maxFees != null;
  if (hasFeeFilter && !exclude.has('fees')) {
    const min = input.minFees ?? 0;
    const max = input.maxFees ?? Number.MAX_SAFE_INTEGER;
    const courseScope = courses.length
      ? ` AND fc.course_id IN (SELECT id FROM courses WHERE slug IN (${placeholders(courses)}))`
      : '';
    push(
      `EXISTS (
        SELECT 1 FROM college_courses fc
        WHERE fc.college_id = c.id AND fc.total_fees_inr BETWEEN ? AND ?${courseScope}
      )`,
      min,
      max,
      ...courses,
    );
  }

  if (input.minPackage != null && !exclude.has('minPackage')) {
    push('c.avg_package_lpa >= ?', input.minPackage);
  }

  if (input.minHighestPackage != null && !exclude.has('minHighestPackage')) {
    push('c.highest_package_lpa >= ?', input.minHighestPackage);
  }

  if (input.placementVerified && !exclude.has('placementVerified')) {
    push('c.placement_verified = 1');
  }

  if (input.establishedMin != null && !exclude.has('established')) {
    push('c.established_year >= ?', input.establishedMin);
  }
  if (input.establishedMax != null && !exclude.has('established')) {
    push('c.established_year <= ?', input.establishedMax);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

/** MIN course fee for the sort-by-fee options, scoped to the course filter. */
export function feeSortExpression(courses) {
  const scope = courses.length
    ? ` AND fc.course_id IN (SELECT id FROM courses WHERE slug IN (${placeholders(courses)}))`
    : '';
  return `(SELECT MIN(fc.total_fees_inr) FROM college_courses fc WHERE fc.college_id = c.id${scope})`;
}
