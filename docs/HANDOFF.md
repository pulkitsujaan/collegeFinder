# Handoff — GradeGo

Complete working context for picking this project up on any machine.
Written 2026-10-09. For the product spec and rules, read [`CLAUDE.md`](../CLAUDE.md) first.

---

## 1. What this is

GradeGo — a college/university discovery site for Indian students. Students
pick a course and city, filter colleges, compare up to three, shortlist them, and
open detail pages. Prototype stage: the whole feature set runs front to back
against a real Express + SQLite backend, but the data is sample data.

Repo: `https://github.com/pulkitsujaan/collegeFinder` (branch `main`).

## 2. Where things stand

| Area | State |
|---|---|
| Backend | Complete — Express 4 + SQLite, 8 route modules, zod validation on every input |
| Frontend | Complete — 9 routes, all lazy-loaded, all wired to the API |
| Tests | 53 passing in `server/tests/api.test.js` (vitest + supertest) |
| Seed | 154 colleges, 27 courses, 28 exams, 684 college-course rows |
| Auth | Working — JWT in an httpOnly cookie, bcryptjs hashes, server shortlist sync |
| Docs | `README.md`, `docs/API.md`, `docs/DECISIONS.md` |
| Deploy | Config committed, not yet confirmed live — see §8 |

Not started: the two stretch features (college predictor, enquiry/lead form).
`docs/VERIFICATION.md` was specified in CLAUDE.md §8 and was never written.
`api/` and `docker/` exist but are empty.

## 3. Stack

- **Client** — React 18, Vite 6, React Router 6, TanStack Query 5, `motion`,
  Lenis, Tailwind 3 with a custom theme. Fonts via `@fontsource-variable`
  (Fraunces, Instrument Sans) and `@fontsource/ibm-plex-mono`.
- **Server** — Node 22 (**pinned** — see §8), Express 4, `better-sqlite3` 11,
  zod, helmet, cors, morgan, express-rate-limit, jsonwebtoken, bcryptjs.
- **Repo** — npm workspaces (`server`, `client`), so one `npm install` at the
  root covers both. ES modules everywhere (`"type": "module"`).

No ORM, no TypeScript. SQL is hand-written and parameterised, all of it inside
`server/src/db/`.

## 4. Repository map

```
package.json          workspaces + root scripts (dev, seed, test, build, lint)
render.yaml           Render blueprint for the API
api/, docker/         empty placeholders — nothing in them
docs/
  API.md              every endpoint, params, response shapes, CSV format
  DECISIONS.md        running log of design choices, newest at the bottom
  HANDOFF.md          this file
server/
  .env.example        PORT, CLIENT_ORIGIN, DATABASE_FILE, JWT_SECRET, ...
  data/               colleges.json, cities.json, courses.json, exams.json,
                      facilities.json (+ the generated .sqlite, gitignored)
  src/
    app.js            createApp() — middleware + routes, no listener
    index.js          boot: seeds if the DB is missing, then listens
    config.js         env parsing; SERVER_ROOT resolves paths for scripts
    db/
      schema.sql      every table + filter indexes
      connection.js   getDb(), applySchema(), isSeeded(), closeDb()
      repositories/   colleges.js, filters.js, meta.js, exams.js
    routes/           index, colleges, meta, exams, compare, rankings, auth,
                      shortlist
    schemas/          auth.js, query.js (zod)
    middleware/       error.js, validate.js, auth.js, rateLimit.js
    scripts/          seed.js (exports seed(), idempotent), import-csv.js
  tests/api.test.js   53 tests, seeds its own SQLite file
client/
  vercel.json         SPA rewrite + build config
  .env.example        VITE_API_URL
  scripts/fetch-cover-photos.mjs   re-downloads the cover photo pool
  public/covers/      51 .jpg, ~11 MB, committed
  src/
    routes.jsx        all 9 routes, each lazy()
    api/client.js     fetch wrapper, ApiError, toQueryString, api.* methods
    api/hooks.js      every TanStack Query hook
    lib/              AuthContext, ShortlistContext, CompareContext, cover.js,
                      coverPhotos.js, postcard.js, format.js, storage.js,
                      useCountUp, useSmoothScroll, useDocumentTitle
    components/       ui/ (Button, Sheet, Skeleton, Toast, ...),
                      filters/ (FilterPanel, MobileFilterSheet, RangeSlider,
                      MultiSelect, ChipGroup, SearchBox, SortSelect, Toggle,
                      ActivePills, useFilterState),
                      college/ (CollegeCard, CollegeCover, CityPostcard,
                      PackageBar, SentenceBuilder, MonogramChip),
                      layout/ (SiteLayout, TopBar, CompareTray,
                      ShortlistDrawer, ScrollStrip, Footer, PageTransition,
                      RouteFallback, Wordmark)
    pages/            Home, Colleges, CollegeDetail, Compare, Exams,
                      ExamDetail, Rankings, Login, NotFound
    styles/           tokens.css (CSS variables), global.css
```

## 5. Running it

```bash
npm install          # root — installs both workspaces
npm run seed         # builds server/data/gradego.sqlite from the JSON
npm run dev          # server :4000 + client :5173 (concurrently)
```

Requires Node 22. Other root scripts: `npm test` (API suite), `npm run build`
(client bundle), `npm run lint`, `npm run format`, `npm run covers` (re-fetch
cover photos), `npm run import:csv`.

The client dev server proxies `/api` to `http://localhost:4000`, so no env file
is needed locally.

## 6. Data

`schema.sql` drops and recreates every table, so `npm run seed` is destructive
but repeatable. Tables: `colleges`, `courses`, `college_courses`, `exams`,
`college_exams`, `facilities`, `college_facilities`, `users`, `shortlists`,
`enquiries`. Indexes exist on every column used for filtering.

**Honesty rule that must survive edits:** college identity (name, city, state,
ownership, founding year, website) is real. Fees, packages, ratings, seats and
cut-offs are generated by a seeded PRNG keyed on the college slug — plausible,
deterministic, and stamped `data_source: "sample"`. The UI carries a sample-data
note and detail pages carry a badge. Never let a generated number read as fact.

CSV import: `npm run import:csv` — column format documented in `docs/API.md`.

## 7. API

Base `/api`. Success responses are plain JSON; errors are
`{ "error": { "code", "message", "details?" } }`.

```
GET  /api/health
GET  /api/colleges                 q, course, stream, city, state, ownership,
                                   exam, minRating, minFees, maxFees,
                                   minPackage, placementVerified, sort, page,
                                   pageSize — multi-values comma-separated
GET  /api/colleges/facets          same params; counts ignore their own filter
GET  /api/colleges/suggest?q=
GET  /api/colleges/slugs
GET  /api/colleges/:slug           detail + 4 similar colleges
GET  /api/compare?slugs=a,b,c      max 3
GET  /api/meta                     courses, streams, cities, states, exams
GET  /api/exams  |  /api/exams/:slug
GET  /api/rankings?course=  |  /api/rankings/courses
POST /api/auth/register | /login | /logout
GET  /api/auth/me
GET/POST /api/shortlist, DELETE /api/shortlist/:slug
```

Sorting: relevance (default), rating, highest package, average package, fees
asc/desc, name A–Z. Page size 12.

## 8. Deployment

Split origin: **API on Render, client on Vercel.** Config is in the repo —
[`render.yaml`](../render.yaml) and [`client/vercel.json`](../client/vercel.json).

Render: Blueprint from the repo. Build `npm install && npm run seed`, start
`npm start --workspace server`, health check `/api/health`.

Vercel: import the repo, **Root Directory `client`**, env var
`VITE_API_URL=https://<service>.onrender.com` (origin only, no `/api`, no
trailing slash — `api/client.js` appends `/api`).

Then set `CLIENT_ORIGIN` on Render to the Vercel URL and redeploy. This is the
step that is easy to forget: CORS rejects any other origin, and cross-site auth
needs it to line up.

Three things that are load-bearing and non-obvious:

1. **Node is pinned to 22.x** (`engines` in `package.json` + `NODE_VERSION` in
   `render.yaml`). Render's default Node 26 has no `better-sqlite3` prebuilt
   binary and its V8 headers break the 11.x C++ sources — the build fails in
   node-gyp with `'class v8::Object' has no member named 'GetPrototype'`.
2. **The session cookie is `SameSite=None; Secure` in production**, driven by
   `COOKIE_SAME_SITE` in `config.js`. `Lax` would be dropped on the cross-site
   fetch and sign-in would fail silently. Locally it stays `lax`, because
   browsers reject `None` without HTTPS.
3. **The server re-seeds on boot when the SQLite file is absent**
   (`server/src/index.js`). Render's free tier has an ephemeral disk.

Consequence of the ephemeral disk: registrations and server-side shortlists are
lost on restart. The college catalogue rebuilds itself. The `localStorage`
shortlist survives. Free instances also spin down when idle, so the first
request after a pause takes ~50 s.

## 9. Client architecture

- **Routes** are all `lazy()`; a single Suspense boundary lives in `SiteLayout`
  so the chrome never unmounts between pages.
- **Server state** is TanStack Query only — no manual `useEffect` fetching.
- **Filter state lives in the URL** (`useSearchParams`), never in component
  state, so links are shareable and back/forward works. `useFilterState` is the
  one place that reads and writes it.
- **Three contexts** carry cross-page state: `ShortlistContext` (localStorage,
  merges with the server list on sign-in), `CompareContext` (max 3, drives the
  tray), `AuthContext` (`GET /api/auth/me` is the only source of truth for who
  is signed in). Storage keys: `shortlist`, `compare`, `recent-searches`.
- **`lib/storage.js`** wraps every access — localStorage throws in private
  windows, so nothing may call it directly.
- **Covers come from two sources**: `lib/coverPhotos.js` picks a deterministic
  photo from the 51-image pool with varied crops, and `lib/cover.js` generates
  an abstract SVG (layered shapes, `feTurbulence` grain, Fraunces monogram) from
  `brand_hue`. The photos are illustrative stock, *not* the actual campuses, and
  the UI says so. Never hotlink a logo or a real photo.

## 10. Design system

Warm "printed prospectus" direction, not SaaS. Tokens live in
`client/src/styles/tokens.css` and mirror into `tailwind.config.js`:
`--paper #F4EFE6`, `--paper-2 #EAE3D6`, `--ink #14171A`, `--ink-soft #4A4F55`,
`--forest #0F3D3E`, `--vermilion #E4572E` (single bold accent),
`--marigold #F2B134` (sparing), `--rule rgba(20,23,26,.14)`.

Fraunces for display and big numerals, Instrument Sans for UI, IBM Plex Mono for
labels and table headers. `CLAUDE.md` §6 has the full do-not list; the short
version — no purple gradients, no glassmorphism, no emoji icons, no uniform
rounded-card grids, no Inter/Roboto/Poppins, no centered-text-over-blur hero.

## 11. Conventions

- API JSON is `camelCase`, DB columns are `snake_case`, mapped in the repository
  layer. Money is integer INR; packages are LPA, shown as `₹2.5 Cr` at ≥ 100.
- React: function components, one component per file, no prop-drilling past two
  levels — use context or the URL.
- Commit messages are imperative and short.
- Adding a dependency means adding a `docs/DECISIONS.md` entry saying why.
- All SQL is parameterised. `docs/API.md` closes with how to add an endpoint.

## 12. Known gotchas

- `city` and `state` filters match exactly, including case. `city=Pune` returns
  rows, `city=pune` returns none. The client always sends canonical values from
  `/api/meta`, so this only bites hand-written URLs.
- `npm run seed` destroys the database. That is intended; use `import:csv` for
  real data.
- `client/public/covers/` is ~11 MB of committed images. Fine for now, worth
  moving to a CDN or generating SVG-only if the repo gets unwieldy.
- Rotating `JWT_SECRET` invalidates every session at once.
- The shortlist merge is one-way: signing in unions browser and server lists,
  after which the server wins.

## 13. Sensible next steps

1. Confirm the deployed pair actually works end to end (§8) and write
   `docs/VERIFICATION.md` with the results — it is the one artifact CLAUDE.md
   asks for that is missing.
2. Stretch features, if wanted: `POST /api/predictor` (Ambitious / Target /
   Safe from `cutoff_value`) and `POST /api/enquiries` plus a lead form. The
   `enquiries` table already exists.
3. Replace sample data via `import:csv` with real, sourced figures, and drop the
   sample-data badges once the numbers are verifiable.
