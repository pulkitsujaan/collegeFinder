# API reference

Base path `/api`. All requests and responses are JSON.

The dev server listens on **http://localhost:4000**. The Vite dev server on
**http://localhost:5173** proxies `/api` through to it, so the client only ever
talks to its own origin.

## Conventions

**Naming.** Request and response fields are `camelCase`. Database columns are
`snake_case`. The mapping happens in `server/src/db/repositories/`.

**Errors.** Every failure, from a validation slip to an unhandled throw, comes
back in one shape:

```json
{ "error": { "code": "BAD_REQUEST", "message": "…", "details": [ … ] } }
```

`details` is present only for validation failures (and carries `{ field, message }`).

| Status | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | A query param or body field failed validation |
| 400 | `BAD_JSON` | The request body is not valid JSON |
| 401 | `UNAUTHORIZED` | A protected route was called without a session |
| 404 | `NOT_FOUND` | Unknown slug, or no route matched |
| 409 | `CONFLICT` | Registering an email that already exists |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled — the message is deliberately generic |

**Multi-value filters.** `course`, `stream`, `city`, `state`, `ownership` and
`exam` accept a comma-separated list: `?city=Pune,Mumbai`. A single value is a
list of one. Values are trimmed and empties dropped. Max 40 values.

**Money and packages.** Fees are integer rupees (`totalFeesInr`, `minFeesInr`).
Packages are LPA numbers (`highestPackageLpa`, `avgPackageLpa`) — the UI renders
`₹2.5 Cr` when the value is ≥ 100.

**Sample data.** Every seeded record carries `dataSource: "sample"`. Anything
imported through `npm run import:csv` carries `dataSource: "csv"` unless the row
says otherwise.

**Rate limits.** `POST /api/auth/register` and `/login`: 20 per 15 min per IP.
`GET /api/colleges/suggest`: 120 per minute. Everything else: 600 per minute.

---

## `GET /api/health`

Liveness probe. Never touches the database beyond a table check.

```json
{ "status": "ok", "service": "gradego-api", "uptime": 42, "database": "seeded" }
```

`database` is `"seeded"` or `"empty"` — useful when a page comes back blank and
you want to know whether `npm run seed` has run.

---

## `GET /api/colleges`

The main listing. Returns a page of colleges with a total.

### Query parameters

| Param | Type | Notes |
|---|---|---|
| `q` | string ≤ 120 | Free text over college name, city and course names |
| `course` | csv of course slugs | e.g. `btech,mba` |
| `stream` | csv of stream names | e.g. `Engineering,Management` |
| `city` | csv | `Delhi-NCR` is a valid grouped value |
| `state` | csv | |
| `ownership` | csv | `Government` \| `Private` \| `Deemed` \| `Autonomous` |
| `exam` | csv of exam slugs | e.g. `jee-main,cat` |
| `minRating` | number 0–10 | |
| `minFees` / `maxFees` | number ≥ 0 | Total course fees, INR |
| `minPackage` | number 0–200 | Minimum **average** package, LPA |
| `minHighestPackage` | number 0–300 | Minimum **highest** package, LPA |
| `placementVerified` | `true` \| `false` | |
| `establishedMin` / `establishedMax` | integer 1800–2100 | |
| `sort` | enum | `relevance` (default) \| `rating` \| `highest_package` \| `avg_package` \| `fees_asc` \| `fees_desc` \| `name` |
| `page` | integer ≥ 1 | Default `1` |
| `pageSize` | integer 1–48 | Default `12` |

Filters combine with **AND**. Multi-values within one filter combine with **OR**.

### Response

```json
{
  "items": [
    {
      "id": 1,
      "slug": "iit-bombay",
      "name": "Indian Institute of Technology Bombay",
      "shortName": "IIT Bombay",
      "city": "Mumbai",
      "state": "Maharashtra",
      "regionGroup": null,
      "ownership": "Government",
      "establishedYear": 1958,
      "rating": 9.4,
      "highestPackageLpa": 62.5,
      "avgPackageLpa": 21.8,
      "placementVerified": true,
      "accreditation": "NAAC A++",
      "campusSizeAcres": 550,
      "brandHue": 214,
      "dataSource": "sample",
      "minFeesInr": 850000,
      "courseNames": ["B.Tech / B.E.", "M.Tech", "MBA / PGDM"]
    }
  ],
  "total": 94,
  "page": 1,
  "pageSize": 12
}
```

`courseNames` is capped at four entries, cheapest courses first. `minFeesInr` is
the cheapest course the college offers, or the cheapest matching the `course`
filter when one is active — so the number on the card agrees with the sort.

A page past the end is a `200` with `items: []` and the real `total`, not a 404.

---

## `GET /api/colleges/facets`

Same query parameters as the listing. Returns how many results each option would
produce **given the other active filters** — each facet ignores its own filter,
so choosing "Pune" shows what the other cities would give you instead.

### Response

```json
{
  "course":    [{ "value": "btech", "count": 61 }],
  "stream":    [{ "value": "Engineering", "count": 61 }],
  "city":      [{ "value": "Pune", "count": 14 }],
  "state":     [{ "value": "Maharashtra", "count": 28 }],
  "ownership": [{ "value": "Government", "count": 24 }],
  "exam":      [{ "value": "jee-main", "count": 48 }],
  "rating":    [{ "value": 7, "count": 71 }],
  "placementVerified": 44,
  "ranges": {
    "fees": { "min": 45000, "max": 4200000 },
    "highestPackage": { "min": 4.5, "max": 88 },
    "avgPackage": { "min": 2.8, "max": 34 },
    "established": { "min": 1847, "max": 2016 }
  },
  "appliedFilters": { "course": [], "stream": [], "city": ["Pune"] }
}
```

In `city`, grouped markets appear as a single option (`Delhi-NCR`) and their
member cities are omitted, so a student cannot double-count. Options with
`count: 0` are **returned, not hidden** — the panel dims them.

---

## `GET /api/colleges/suggest?q=`

Typeahead. `q` is required, 1–80 characters. Rate-limited to 120/min.

```json
{
  "items": [
    { "type": "city",    "label": "Pune", "count": 14, "sublabel": "14 colleges", "href": "/colleges?city=Pune" },
    { "type": "course",  "label": "B.Tech / B.E.", "slug": "btech", "sublabel": "Engineering", "href": "/colleges?course=btech" },
    { "type": "college", "label": "Indian Institute of Technology Bombay", "slug": "iit-bombay",
      "sublabel": "Mumbai, Maharashtra", "rating": 9.4, "href": "/college/iit-bombay" }
  ]
}
```

At most 8 items. Colleges, cities and courses are interleaved rather than
concatenated, so a query like `pune` doesn't bury the city shortcut under eight
college names. `href` is built server-side so the client just navigates to it.

---

## `GET /api/colleges/slugs`

Every slug in the database, sorted. Used by the test suite and the verification
sweep to prove that no detail page 404s.

```json
{ "slugs": ["aiims-delhi", "iit-bombay", "…"] }
```

---

## `GET /api/colleges/:slug`

Full detail for one college.

```json
{
  "id": 1, "slug": "iit-bombay", "name": "Indian Institute of Technology Bombay",
  "shortName": "IIT Bombay", "city": "Mumbai", "state": "Maharashtra",
  "regionGroup": null, "ownership": "Government", "establishedYear": 1958,
  "rating": 9.4, "highestPackageLpa": 62.5, "avgPackageLpa": 21.8,
  "placementVerified": true, "accreditation": "NAAC A++", "campusSizeAcres": 550,
  "brandHue": 214, "dataSource": "sample",
  "description": "…",
  "website": "iitb.ac.in",
  "latitude": 19.1334, "longitude": 72.9133,
  "courses": [
    { "id": 1, "slug": "btech", "name": "B.Tech / B.E.", "stream": "Engineering",
      "level": "UG", "durationYears": 4, "totalFeesInr": 850000, "seats": 900,
      "eligibility": "…", "cutoffNote": "…", "cutoffValue": 98.5 }
  ],
  "exams": [
    { "id": 1, "slug": "jee-main", "name": "JEE Main", "fullName": "Joint Entrance Examination (Main)",
      "stream": "Engineering", "level": "UG", "examDate": "2026-01-24", "resultDate": "2026-02-12" }
  ],
  "facilities": [{ "slug": "hostel", "name": "Hostel", "iconKey": "hostel" }],
  "feeRange": { "min": 850000, "max": 2400000 },
  "facilityCount": 9,
  "similar": [ /* 4 colleges in the same listing shape as GET /api/colleges */ ]
}
```

`similar` prefers the same city, then the same state, then a shared stream,
ordered by how close the rating is. `feeRange` is `null` if the college has no
courses. `cutoffValue` is nullable and is what a future predictor would use.

**404** `NOT_FOUND` for an unknown slug. **400** `BAD_REQUEST` if the slug
contains anything but lowercase letters, digits and hyphens.

---

## `GET /api/compare?slugs=a,b,c`

One to three slugs. The comparison rows are built server-side so every client
renders the same table.

```json
{
  "items": [ /* full college objects with courses, exams, facilities */ ],
  "rows": [
    { "key": "rating", "label": "Student rating", "type": "rating",
      "values": [9.4, 9.2], "best": "high" },
    { "key": "highestPackageLpa", "label": "Highest package", "type": "lpa",
      "values": [62.5, 58.0], "best": "high" }
  ],
  "missing": [],
  "maxCompare": 3
}
```

`type` is one of `text`, `number`, `rating`, `lpa`, `boolean`, `feeRange`,
`list`. `best` is `"high"` on the rows where a winner makes sense (the client
highlights it) and absent elsewhere — there is no best city. Slugs that don't
exist are listed in `missing` and omitted from the table; if **none** of them
exist the request is a 404. Four or more slugs is a 400 whose message says
"up to 3".

---

## `GET /api/meta`

Everything the pickers need, in one request.

```json
{
  "courses": [{ "slug": "btech", "name": "B.Tech / B.E.", "stream": "Engineering",
                "level": "UG", "durationYears": 4, "count": 61, "minFeesInr": 220000 }],
  "streams": [{ "stream": "Engineering", "count": 61 }],
  "cities":  [{ "value": "Pune", "label": "Pune", "state": "Maharashtra", "count": 14 },
              { "value": "Delhi-NCR", "label": "Delhi-NCR", "state": null, "count": 24,
                "grouped": true, "members": ["New Delhi", "Noida", "Gurugram"] }],
  "states":  [{ "state": "Maharashtra", "count": 28 }],
  "exams":   [{ "slug": "jee-main", "name": "JEE Main", "stream": "Engineering",
                "level": "UG", "examDate": "2026-01-24", "count": 48 }],
  "examStreams": [{ "stream": "Engineering", "count": 9 }],
  "ownership": [{ "ownership": "Government", "count": 24 }],
  "totals": { "colleges": 94, "courses": 18, "cities": 14, "exams": 24 }
}
```

`examStreams` is deliberately separate from `streams`. Exams use a smaller,
different vocabulary, so the exams page builds its chips from `examStreams` and
every chip is guaranteed to have at least one exam behind it.

---

## `GET /api/exams`

| Param | Type | Notes |
|---|---|---|
| `stream` | csv | e.g. `Engineering,Management` |
| `level` | enum | `UG` \| `PG` \| `UG/PG` |

```json
{
  "items": [
    { "id": 1, "slug": "jee-main", "name": "JEE Main",
      "fullName": "Joint Entrance Examination (Main)", "stream": "Engineering",
      "level": "UG", "mode": "Computer-based",
      "applicationStart": "2025-11-01", "examDate": "2026-01-24",
      "resultDate": "2026-02-12", "description": "…",
      "dataSource": "sample", "collegeCount": 48 }
  ]
}
```

Ordered by exam date, with exams that have no date last.

## `GET /api/exams/:slug`

One exam, plus up to 12 colleges that accept it (highest rated first).

```json
{
  "slug": "cat", "name": "CAT", "fullName": "Common Admission Test",
  "stream": "Management", "level": "PG", "mode": "Computer-based",
  "applicationStart": "2025-08-05", "examDate": "2025-11-30", "resultDate": "2026-01-05",
  "description": "…", "dataSource": "sample",
  "colleges": [{ "slug": "iim-ahmedabad", "name": "Indian Institute of Management Ahmedabad",
                 "shortName": "IIM Ahmedabad", "city": "Ahmedabad", "state": "Gujarat",
                 "rating": 9.5, "ownership": "Government", "brandHue": 32 }],
  "collegeCount": 17
}
```

404 for an unknown slug.

---

## `GET /api/rankings`

| Param | Type | Notes |
|---|---|---|
| `course` | course slug | Omit to rank the whole catalogue |
| `limit` | integer 1–50 | Default `20` |

The score is published with the results so nobody has to take the ordering on
trust:

```
score = rating × 6
      + min(avg package LPA, 30) × 1.2
      + min(highest package LPA, 60) × 0.35
      × 1.03 when placement data is verified
```

Rating carries the most weight because it is the broadest signal. Average
package is capped at 30 LPA and highest at 60 so a single outlier placement
cannot drag an ordinary college to the top. Sorting falls back to rating when
two scores tie.

```json
{
  "items": [
    { /* …the full listing shape… */
      "score": 74.21,
      "breakdown": { "rating": 9.4, "avgPackageLpa": 21.8,
                     "highestPackageLpa": 62.5, "placementVerified": true } }
  ],
  "course": "btech",
  "formula": "score = rating × 6 + min(avg package LPA, 30) × 1.2 + min(highest package LPA, 60) × 0.35, ×1.03 when placement data is verified"
}
```

## `GET /api/rankings/courses`

The courses that actually have colleges behind them, for the page's chip row.
Same shape as `meta.courses`.

---

## Auth

The session is a JWT in an **httpOnly** cookie named `gradego_token`
(`SameSite=Lax`, `Secure` in production, 7-day expiry by default). It is not
readable by JavaScript, so an XSS bug cannot walk off with it.

### `POST /api/auth/register`

```json
{ "email": "you@example.com", "password": "at-least-8-chars", "name": "Optional" }
```

Email is lowercased and trimmed. Password must be 8–200 characters; `name` is
optional. **201** with `{ "user": … }` and a `Set-Cookie`. **409** `CONFLICT` if
the email is taken. **400** on a bad email or a short password.

### `POST /api/auth/login`

```json
{ "email": "you@example.com", "password": "…" }
```

**200** with `{ "user": … }` and a fresh cookie. **401** otherwise — and the
message is *identical* for a wrong password and an unknown email, so the endpoint
cannot be used to find out which addresses have accounts.

### `POST /api/auth/logout`

Clears the cookie. Always **200**.

### `GET /api/auth/me`

**200** with `{ "user": { "id": 1, "email": "…", "name": "…", "createdAt": "…" } }`,
or `{ "user": null }` when there is no valid session. It never 401s, so the
client can ask "am I signed in?" on every page load without handling an error.

The password hash is never included in any response.

---

## Shortlist

All routes require a session — **401** `UNAUTHORIZED` without one.

### `GET /api/shortlist`

```json
{ "items": [ /* the listing shape */ ], "slugs": ["iit-bombay", "iim-ahmedabad"] }
```

Newest save first. `slugs` is there so the client can answer "is this college
saved?" without scanning the objects.

### `POST /api/shortlist`

```json
{ "slug": "iit-bombay" }
```

**201** with the refreshed list. Saving a college twice is a no-op, not a
duplicate. **404** if the slug is not a college.

### `DELETE /api/shortlist/:slug`

**200** with the refreshed list. Removing something that was not there is still
a 200 — the end state is what was asked for.

---

## CSV import

Not an HTTP endpoint, but a CLI: see `npm run import:csv` in the
[README](../README.md#importing-your-own-data). The column list lives at the top
of `server/src/scripts/import-csv.js`, which is the file that enforces it.

---

## Adding an endpoint

1. Put the SQL in `server/src/db/repositories/`, never in a route.
2. Add a zod schema to `server/src/schemas/` and wire it with
   `validate(schema, 'query' | 'body' | 'params')`.
3. Return `camelCase`, and map `snake_case` in the repository.
4. Add a test to `server/tests/api.test.js`.
