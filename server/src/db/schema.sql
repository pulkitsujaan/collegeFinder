-- CollegeDost schema (SQLite).
-- Applied by `npm run seed`, which drops and recreates every table so the seed
-- is idempotent. All SQL lives under server/src/db/.

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS college_facilities;
DROP TABLE IF EXISTS college_exams;
DROP TABLE IF EXISTS college_courses;
DROP TABLE IF EXISTS facilities;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS colleges;
DROP TABLE IF EXISTS shortlists;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS enquiries;

-- ---------------------------------------------------------------------------
-- Colleges
-- ---------------------------------------------------------------------------
CREATE TABLE colleges (
  id                 INTEGER PRIMARY KEY,
  slug               TEXT    NOT NULL UNIQUE,
  name               TEXT    NOT NULL,
  short_name         TEXT    NOT NULL,
  city               TEXT    NOT NULL,
  state              TEXT    NOT NULL,
  -- Grouped market, e.g. "Delhi-NCR" covers Delhi, Noida, Gurugram, Ghaziabad.
  region_group       TEXT,
  ownership          TEXT    NOT NULL CHECK (ownership IN ('Government','Private','Deemed','Autonomous')),
  established_year   INTEGER,
  description        TEXT    NOT NULL,
  website            TEXT,
  rating             REAL    NOT NULL CHECK (rating >= 0 AND rating <= 10),
  highest_package_lpa REAL   NOT NULL,
  avg_package_lpa    REAL    NOT NULL,
  placement_verified INTEGER NOT NULL DEFAULT 0 CHECK (placement_verified IN (0,1)),
  accreditation      TEXT,
  campus_size_acres  INTEGER,
  latitude           REAL,
  longitude          REAL,
  -- Deterministic seed for the generated cover art (0-359).
  brand_hue          INTEGER NOT NULL CHECK (brand_hue >= 0 AND brand_hue < 360),
  data_source        TEXT    NOT NULL DEFAULT 'sample',
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_colleges_city        ON colleges(city);
CREATE INDEX idx_colleges_state       ON colleges(state);
CREATE INDEX idx_colleges_region      ON colleges(region_group);
CREATE INDEX idx_colleges_ownership   ON colleges(ownership);
CREATE INDEX idx_colleges_rating      ON colleges(rating);
CREATE INDEX idx_colleges_avg_package ON colleges(avg_package_lpa);
CREATE INDEX idx_colleges_high_package ON colleges(highest_package_lpa);
CREATE INDEX idx_colleges_established ON colleges(established_year);
CREATE INDEX idx_colleges_name        ON colleges(name);

-- ---------------------------------------------------------------------------
-- Courses and the college <-> course join (where fees, seats and cutoffs live)
-- ---------------------------------------------------------------------------
CREATE TABLE courses (
  id             INTEGER PRIMARY KEY,
  slug           TEXT    NOT NULL UNIQUE,
  name           TEXT    NOT NULL,
  stream         TEXT    NOT NULL,
  level          TEXT    NOT NULL CHECK (level IN ('UG','PG','Diploma','Doctorate')),
  duration_years REAL    NOT NULL
);

CREATE INDEX idx_courses_stream ON courses(stream);
CREATE INDEX idx_courses_level  ON courses(level);

CREATE TABLE college_courses (
  college_id     INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  course_id      INTEGER NOT NULL REFERENCES courses(id)   ON DELETE CASCADE,
  total_fees_inr INTEGER NOT NULL,
  seats          INTEGER,
  eligibility    TEXT,
  cutoff_note    TEXT,
  -- Null for courses with no single cut-off (used by the college predictor).
  cutoff_value   REAL,
  PRIMARY KEY (college_id, course_id)
);

CREATE INDEX idx_cc_course_id ON college_courses(course_id);
CREATE INDEX idx_cc_fees      ON college_courses(total_fees_inr);
CREATE INDEX idx_cc_cutoff    ON college_courses(cutoff_value);

-- ---------------------------------------------------------------------------
-- Entrance exams
-- ---------------------------------------------------------------------------
CREATE TABLE exams (
  id                INTEGER PRIMARY KEY,
  slug              TEXT    NOT NULL UNIQUE,
  name              TEXT    NOT NULL,
  full_name         TEXT    NOT NULL,
  stream            TEXT    NOT NULL,
  level             TEXT    NOT NULL CHECK (level IN ('UG','PG','UG/PG')),
  mode              TEXT    NOT NULL CHECK (mode IN ('Online','Offline','Online/Offline')),
  application_start TEXT,
  exam_date         TEXT,
  result_date       TEXT,
  description       TEXT    NOT NULL,
  data_source       TEXT    NOT NULL DEFAULT 'sample'
);

CREATE INDEX idx_exams_stream ON exams(stream);
CREATE INDEX idx_exams_level  ON exams(level);
CREATE INDEX idx_exams_date   ON exams(exam_date);

CREATE TABLE college_exams (
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  exam_id    INTEGER NOT NULL REFERENCES exams(id)    ON DELETE CASCADE,
  PRIMARY KEY (college_id, exam_id)
);

CREATE INDEX idx_ce_exam_id ON college_exams(exam_id);

-- ---------------------------------------------------------------------------
-- Facilities
-- ---------------------------------------------------------------------------
CREATE TABLE facilities (
  id       INTEGER PRIMARY KEY,
  slug     TEXT NOT NULL UNIQUE,
  name     TEXT NOT NULL,
  icon_key TEXT NOT NULL
);

CREATE TABLE college_facilities (
  college_id  INTEGER NOT NULL REFERENCES colleges(id)  ON DELETE CASCADE,
  facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  PRIMARY KEY (college_id, facility_id)
);

CREATE INDEX idx_cf_facility_id ON college_facilities(facility_id);

-- ---------------------------------------------------------------------------
-- Accounts, shortlists and enquiries
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE shortlists (
  user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, college_id)
);

CREATE TABLE enquiries (
  id               INTEGER PRIMARY KEY,
  college_id       INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  course_interest  TEXT,
  message          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_enquiries_college ON enquiries(college_id);
