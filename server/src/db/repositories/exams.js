import { getDb } from '../connection.js';

function mapExam(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    fullName: row.full_name,
    stream: row.stream,
    level: row.level,
    mode: row.mode,
    applicationStart: row.application_start,
    examDate: row.exam_date,
    resultDate: row.result_date,
    description: row.description,
    dataSource: row.data_source,
  };
}

export function listExams({ stream, level } = {}) {
  const db = getDb();
  const clauses = [];
  const params = [];

  if (stream?.length) {
    clauses.push(`e.stream IN (${stream.map(() => '?').join(', ')})`);
    params.push(...stream);
  }
  if (level) {
    clauses.push('e.level = ?');
    params.push(level);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  return db
    .prepare(
      `SELECT e.*, COUNT(DISTINCT ce.college_id) AS college_count
       FROM exams e
       LEFT JOIN college_exams ce ON ce.exam_id = e.id
       ${where}
       GROUP BY e.id
       ORDER BY e.exam_date IS NULL, e.exam_date ASC, e.name ASC`,
    )
    .all(...params)
    .map((row) => ({ ...mapExam(row), collegeCount: row.college_count }));
}

export function getExamBySlug(slug) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM exams WHERE slug = ?').get(slug);
  if (!row) return null;

  const exam = mapExam(row);
  exam.colleges = db
    .prepare(
      `SELECT c.slug, c.name, c.short_name, c.city, c.state, c.rating, c.ownership, c.brand_hue
       FROM college_exams ce
       JOIN colleges c ON c.id = ce.college_id
       WHERE ce.exam_id = ?
       ORDER BY c.rating DESC
       LIMIT 12`,
    )
    .all(row.id)
    .map((college) => ({
      slug: college.slug,
      name: college.name,
      shortName: college.short_name,
      city: college.city,
      state: college.state,
      rating: college.rating,
      ownership: college.ownership,
      brandHue: college.brand_hue,
    }));
  exam.collegeCount = db
    .prepare('SELECT COUNT(*) AS n FROM college_exams WHERE exam_id = ?')
    .get(row.id).n;

  return exam;
}

export function listStreams() {
  return getDb()
    .prepare('SELECT DISTINCT stream FROM exams ORDER BY stream')
    .all()
    .map((row) => row.stream);
}
