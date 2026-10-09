# CollegeDost

A college and university discovery site for Indian students. Pick a course and a
city, filter down, compare up to three colleges side by side, shortlist the ones
worth a second look, and read a detail page for each.

This is a **working prototype**, not a product. Everything is wired to a real
backend — the filters filter, the comparison compares, the shortlist survives a
reload. Nothing is stubbed.

---

## Quick start

Requires **Node 20 or newer** (developed on 22). Nothing else — no database
server, no Docker, no API keys.

```bash
npm install
npm run seed     # builds server/data/collegedost.sqlite from the sample data
npm run dev      # API on :4000, site on :5173
```

Then open **http://localhost:5173**.

`npm run dev` runs both processes under `concurrently`. The Vite dev server
proxies `/api` to the API, so the browser only ever talks to one origin.

### All the scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + client together |
| `npm run dev:server` | Just the API, with `node --watch` |
| `npm run dev:client` | Just the Vite server |
| `npm run seed` | Rebuild the SQLite database from `server/data/*.json` |
| `npm test` | API test suite (vitest + supertest) |
| `npm run build` | Production build of the client into `client/dist` |
| `npm run import:csv -- <file>` | Load your own colleges from a CSV |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |

### Configuration

`npm run dev` works with no configuration at all. To change something, copy
`server/.env.example` to `server/.env`:

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `4000` | API port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated CORS allow-list |
| `DATABASE_FILE` | `data/collegedost.sqlite` | Relative to `server/` |
| `JWT_SECRET` | `dev-only-change-me` | **Change this for anything real** |
| `JWT_EXPIRES_DAYS` | `7` | Session lifetime |
| `NODE_ENV` | `development` | `production` switches to combined logs and secure cookies |

`.env` is gitignored. Only `.env.example` is committed, and it contains no
secrets.

---

## What's in it

**Home** — a sentence-builder hero ("I want to study *B.Tech* in *Pune* with
fees under *₹5 L*") that routes straight to a filtered listing, a draggable strip
of generated city postcards, a stream browser, the top-rated colleges, a
count-up stats band, and the upcoming exam dates.

**Listing** (`/colleges`) — the core of the product. Twelve filters, seven sort
orders, live facet counts, removable filter pills, skeleton loaders, an empty
state that offers to clear your filters, and a mobile filter bottom sheet with a
live result count. **Every filter lives in the URL**, so any view is a shareable
link, and back/forward/reload all behave.

**Detail** (`/college/:slug`) — a generated cover, sticky scroll-spy tabs, full
course and fee table, packages as big numerals next to a comparison bar,
entrance exams, facilities, an approximate-location plot, and four similar
colleges.

**Compare** (`/compare`) — up to three colleges, thirteen rows, winners
highlighted. A tray slides up from the bottom of every page once you pick one,
and it persists across navigation and reloads.

**Shortlist** — a drawer from the top bar, kept in `localStorage`, and synced to
the server once you sign in.

**Exams** (`/exams`) and **Rankings** (`/rankings`) — 28 entrance exams with
application, exam and result dates filterable by stream; and per-course ranked
lists whose scoring formula is printed on the page.

**Accounts** — optional. The whole site works signed out. Signing in does one
thing: lifts your shortlist off the browser and onto the server.

### How the sample data works

The numbers are **made up on purpose** — and labelled as such.

College names, cities, states, ownership and website domains are real, and were
checked against the institutions' own sites. Every figure that isn't common
knowledge — fees, packages, ratings, seat counts, cutoffs, campus sizes — is a
plausible invention. Every record carries `dataSource: "sample"`, listings carry
a one-line note, and detail pages carry a badge saying to check the official
site.

The invented values are generated deterministically from each college's slug
(FNV-1a → mulberry32), so re-seeding produces identical data and a college's
stats stay consistent with its generated cover art.

The dataset: **154 colleges across 73 cities and 26 states**, 27 courses, 28
exams, 14 facilities.

### Importing your own data

```bash
npm run seed                                  # reference data first
npm run import:csv -- path/to/colleges.csv
npm run import:csv -- path/to/colleges.csv --replace   # drop the sample colleges
```

One row per college–course pair; college fields repeat. The importer validates
the whole file before writing anything and reports **every** problem at once
(`line 42: unknown city "Punee"`), rather than failing on the first one or
silently dropping rows. Unknown cities, courses or exams are refused —
reference data has to exist before it can be joined against. Imported rows are
stamped `dataSource: "csv"` so they are never confused with the sample data.

The full column list is at the top of `server/src/scripts/import-csv.js`.

---

## How it's built

```
server/    Express + better-sqlite3. All SQL lives in src/db/repositories/.
client/    React 18 + Vite + Tailwind, with TanStack Query for server state.
docs/      API reference, decision log, verification record.
```

**Stack.** React 18 and Vite on the front; TanStack Query for anything that
comes from the server (no manual `useEffect` fetching); React Router with the
URL as the single source of truth for filter state. Express and SQLite
(`better-sqlite3`) behind a REST API. Zod validates every request. Vitest and
supertest test the API against a real seeded database.

**Why SQLite.** College search is faceted filtering — course, city, fees,
rating, exam, ownership — with joins between colleges, courses and exams. That
is relational work, and SQLite does it with no server to install and real SQL to
write. All queries are parameterised and live in one directory, so moving to
PostgreSQL later is mechanical.

**Design.** Warm paper tones, Fraunces for display, Instrument Sans for body,
IBM Plex Mono for labels — all self-hosted, so there are no third-party requests
and no layout shift. Every image on the site is **generated SVG**: college
covers, city skylines, the empty-state illustration. Nothing is hotlinked and
nothing can 404.

### Testing

```bash
npm test
```

The suite seeds its own database and drives the real Express app through
supertest — no mocked repositories, so a broken SQL join fails the tests. It
covers the listing and every filter, sorting, pagination bounds, facet counts
(including the rule that a facet ignores its own filter), suggestions, the
detail payload for **every** seeded slug, comparison limits, exams, rankings,
auth, and the shortlist.

### Documentation

- [`docs/API.md`](docs/API.md) — every endpoint, parameter and response shape
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why the code looks the way it does
- [`docs/VERIFICATION.md`](docs/VERIFICATION.md) — the manual checklist and its results

### Deploying

The API goes to Render and the client to Vercel. Both are configured in the repo.

**1. API — Render.** Create a Blueprint from this repo; [`render.yaml`](render.yaml)
defines the service. Then set `CLIENT_ORIGIN` in the dashboard to the Vercel
URL from step 2 (e.g. `https://collegedost.vercel.app`), and redeploy. The build
runs `npm run seed`, and a fresh instance re-seeds on boot if the SQLite file is
missing, so the API never starts against an empty database.

**2. Client — Vercel.** Import the repo, set **Root Directory** to `client`, and
add an environment variable `VITE_API_URL` set to the Render service origin
(`https://<service>.onrender.com`, no trailing slash). Then deploy.
[`client/vercel.json`](client/vercel.json) handles the SPA rewrite so deep links
like `/college/coep-pune` resolve.

The two do not need to share a domain: the API allows the client origin through
CORS with credentials and the session cookie switches to `SameSite=None; Secure`
in production. Local dev is unaffected (`npm run dev` still proxies `/api`).

Free Render instances have an ephemeral disk. The college catalogue is rebuilt
on boot, but anything users write — signups and server-side shortlists — is lost
when the instance restarts. The shortlist in `localStorage` survives.

---

## Known limits

- **The data is sample data.** See above. Do not make a decision about your
  education based on it.
- **Sessions live in a JWT cookie**, so signing out is client-side and a
  rotated `JWT_SECRET` invalidates every session at once. Fine for a prototype,
  not a substitute for a session store.
- **The shortlist merge is one-way.** Signing in unions the browser's list with
  the server's; after that the server wins, so a stale browser can resurrect a
  college you deleted elsewhere.
- **`npm run seed` destroys the database** and rebuilds it. That is the point,
  but don't keep anything in there you care about. Use `import:csv` for real data.
- **No payments, no SMS, no admin, no real placement statistics.** Most of
  `CLAUDE.md`'s "out of scope" list.
