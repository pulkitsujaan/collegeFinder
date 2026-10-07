# CLAUDE.md — College Discovery Platform (working name: **CollegeDost**)

You are building the **first working prototype** of a college & university discovery website for Indian students, in the same product space as careermantra.net: students pick a course and city, filter colleges, compare them, shortlist them, and view detailed college pages.

Build this end to end in this folder. Do not ask for permission at every step. Make sensible decisions, record them in `docs/DECISIONS.md`, and keep going. Only stop to ask me if something truly blocks you.

---

## 1. Ground rules (read first)

1. **Working over pretty-but-broken.** Every page, filter, and button you ship must actually work against the real backend. No `TODO` stubs, no lorem ipsum, no dead links, no fake buttons.
2. **Work in milestones** (section 9). After each milestone: run the app, verify it works (curl the API, load the pages), fix problems, then `git commit` with a clear message. Do not move on with a broken build.
3. **Do not scrape or copy careermantra.net** (or any site): no copying their text, images, logos, or layout. Take inspiration from the *feature set* only. The design is original (section 6).
4. **Data honesty.** Seed data is *sample data* (section 5). Never present invented numbers as verified facts. The UI shows a small, tasteful "Sample data" note, and every record has `data_source: "sample"`.
5. **Keep it simple and readable.** Plain JavaScript (ES modules), no TypeScript for the prototype. Small files, clear names, comments only where the *why* is not obvious.
6. **Never commit secrets.** Use `.env` (gitignored) plus `.env.example`.
7. When you finish, the whole thing must start with **one command**: `npm run dev` from the repo root.

---

## 2. Product scope

### Must have (prototype)
- **Home page** — immersive landing: course picker + city picker, search box with live suggestions, featured cities, stream browser, top-rated colleges, upcoming exams strip.
- **College listing page** (`/colleges`) — the core feature. Filters (section 4), sorting, pagination or infinite scroll, URL-synced filter state (shareable links), result count, loading and empty states.
- **College detail page** (`/college/:slug`) — overview, courses & fees, placements (highest/average package), rating, location, exams accepted, ownership, established year, facilities, similar colleges, "Add to shortlist" and "Add to compare".
- **Compare page** (`/compare`) — side-by-side table for up to 3 colleges, chosen via a compare tray that persists across pages.
- **Shortlist** — save colleges (localStorage for the prototype), shown in a drawer/page.
- **Exams page** (`/exams`) — list of entrance exams with application / exam / result dates, filterable by stream.
- **Student-choice ranking** (`/rankings`) — ranked lists by course (e.g. top B.Tech, top MBA) driven by the rating + placement data.
- **Auth-lite** — email + password signup/login with JWT in an httpOnly cookie, used to sync the shortlist to the server. Optional for the first pass but build it if time allows after everything above works.

### Stretch (only after everything above is solid)
- **College predictor**: student enters exam + score/percentile, gets colleges grouped into Ambitious / Target / Safe (use cutoff fields in the DB).
- **Lead form** ("Request a callback" / "Apply") that stores an enquiry in the DB. No emails or payments.

### Out of scope
Payments, real OTP/SMS, admin dashboard, mock tests, blogs, scholarships tests, real-time features.

---

## 3. Tech stack and architecture

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React 18 + Vite**, React Router, **TanStack Query**, **Motion** (framer-motion successor, `motion` package), Lenis for smooth scroll | Fast dev, URL-driven data, great animation story |
| Styling | **Tailwind CSS** with a custom theme from section 6 + a small amount of hand-written CSS for special effects | Consistent tokens, fast iteration |
| Backend | **Node.js 20+ with Express** | Simple REST API |
| Database | **SQLite via `better-sqlite3`** | Zero setup for the prototype, real SQL for faceted filtering, easy to migrate to PostgreSQL later (keep all SQL inside `server/src/db/`) |
| Validation | **zod** on every request | Safe filters |
| Tests | **vitest** + **supertest** for the API (at least the search endpoint) | Prove filters work |
| Tooling | `concurrently` at repo root, ESLint + Prettier | One-command dev |

Why SQLite and not MongoDB: college search is faceted filtering (course + city + fee range + rating + exam + ownership) with joins between colleges, courses, and exams. That is naturally relational. Do not add an ORM; write clear parameterised SQL in a repository layer.

### Repo layout

```
/
├─ CLAUDE.md
├─ README.md                 # how to install, run, seed, test (you write this)
├─ package.json              # root scripts (dev, seed, test, build)
├─ docs/
│  ├─ DECISIONS.md           # running log of choices you made
│  └─ API.md                 # endpoint reference
├─ server/
│  ├─ package.json
│  ├─ .env.example
│  ├─ data/                  # seed JSON/CSV + the generated .sqlite file (gitignored)
│  └─ src/
│     ├─ index.js            # express bootstrap
│     ├─ config.js
│     ├─ db/ (schema.sql, connection.js, repositories/*.js)
│     ├─ routes/ (colleges.js, meta.js, exams.js, auth.js, compare.js)
│     ├─ middleware/ (error.js, validate.js, rateLimit.js)
│     └─ scripts/ (seed.js, import-csv.js)
└─ client/
   ├─ package.json
   ├─ index.html
   └─ src/
      ├─ main.jsx, App.jsx, routes.jsx
      ├─ api/ (client.js, hooks.js)
      ├─ components/ (ui/, layout/, college/, filters/)
      ├─ pages/ (Home, Colleges, CollegeDetail, Compare, Exams, Rankings, Login...)
      ├─ lib/ (format.js, cover.js, storage.js)
      └─ styles/ (tokens.css, global.css)
```

Root scripts: `npm run dev` (server + client together), `npm run seed`, `npm test`, `npm run build`. Client dev server proxies `/api` to the server (server on port 4000, client on 5173).

---

## 4. Filters, sorting, and search (the heart of the product)

Colleges can be filtered by all of the following, combined with AND logic, all reflected in the URL query string:

| Filter | UI control | Notes |
|---|---|---|
| **Course** | Chip group (B.Tech, MBA/PGDM, BBA, BCA, MCA, B.Com, BA, B.Sc, M.Sc, MBBS, BDS, BAMS, BHMS, LLB, B.Des …) | Single or multi-select |
| **Stream** | Chip group (Engineering, Management, Commerce, Law, Arts, Architecture, Dental, Agriculture, Design, Hotel Management, Science, Aviation, Computer, Animation, Veterinary, Medical) | Parent category of courses |
| **City** | Searchable multi-select with college counts | Include "Delhi-NCR" as a grouped city |
| **State** | Searchable multi-select with counts | |
| **Fees** | Dual-handle range slider (total course fees, ₹) | Min/max from data |
| **Rating** | Minimum rating (e.g. 7+, 8+, 9+) | Out of 10 |
| **Highest / average package** | Min LPA slider | |
| **Ownership** | Government / Private / Deemed / Autonomous | |
| **Entrance exam accepted** | Multi-select (JEE Main, CAT, XAT, MAT, CMAT, SNAP, NMAT, ATMA, NEET, CLAT …) | |
| **Placement verified** | Toggle | |
| **Established** | Optional range | |
| **Text search** | Search by college name, city, or course | Debounced, with typeahead suggestions |

**Sorting:** Relevance (default), Rating, Highest package, Average package, Fees low→high, Fees high→low, Name A–Z.

**Facet counts:** The filter panel shows how many results each option would produce given the *other* active filters (e.g. "Pune (14)"). Options with 0 results are dimmed, not hidden. Implement this in a single `/api/colleges/facets` endpoint.

**Behaviour requirements**
- Changing a filter updates the URL and results without a full page reload; browser back/forward works.
- Results show skeleton loaders (not spinners) while loading and a friendly, illustrated empty state with a "Clear filters" action.
- Active filters appear as removable pills above the results.
- On mobile the filter panel is a bottom sheet with an "Apply" button and a live result count.
- Pagination: 12 per page (or infinite scroll with "Load more"), total count always visible.

---

## 5. Data model and seed data

### Schema (SQLite, in `server/src/db/schema.sql`)

- `colleges` — id, slug (unique), name, short_name, city, state, region_group (e.g. "Delhi-NCR"), ownership, established_year, description, website, rating (0–10), highest_package_lpa, avg_package_lpa, placement_verified (0/1), accreditation (text, e.g. "NAAC A+"), campus_size_acres, latitude, longitude, brand_hue (int 0–360, used for generated covers), data_source, created_at
- `courses` — id, name, slug, stream, level (UG/PG/Diploma/Doctorate), duration_years
- `college_courses` — college_id, course_id, total_fees_inr, seats, eligibility, cutoff_note, cutoff_value (nullable, used by predictor)
- `exams` — id, name, slug, full_name, stream, level, mode, application_start, exam_date, result_date, description
- `college_exams` — college_id, exam_id
- `facilities` — id, name, icon_key; `college_facilities` — college_id, facility_id
- `users` — id, email (unique), password_hash, name, created_at
- `shortlists` — user_id, college_id, created_at
- `enquiries` — id, college_id, name, phone, email, course_interest, created_at (stretch)

Add indexes on every column used in filtering (city, state, ownership, rating, college_courses.course_id, college_exams.exam_id, fees).

### Seed data (`server/data/*.json` + `server/src/scripts/seed.js`)

- Create **at least 80 colleges** spread across **at least 12 cities** (Delhi-NCR, Mumbai, Pune, Bengaluru, Hyderabad, Chennai, Kolkata, Chandigarh, Jaipur, Lucknow, Indore, Dehradun, Bhubaneswar, Ahmedabad) and **at least 12 courses**, with realistic variety: some colleges offer several courses, fee ranges vary widely, ownership types vary.
- Use **real, well-known Indian institutions** (IITs, NITs, IIMs, IIITs, central/state universities, well-known private universities) with correct name, city, state, and ownership type.
- All numeric details that you cannot be sure of (fees, packages, ratings, cutoffs, seats) are **plausible illustrative values**. Mark every record `data_source: "sample"`. In the UI, add a footer note and a small badge on detail pages: *"Sample data for prototype. Verify details on the official college website."* Always include the official website domain only if you are confident it is correct.
- Create **at least 20 exams** (JEE Main, JEE Advanced, CAT, XAT, MAT, CMAT, SNAP, NMAT, NEET UG, CLAT, CUET, BITSAT, VITEEE, etc.) with plausible dates relative to the current year.
- Make the seed **idempotent** (running it twice does not duplicate anything) and fast (single transaction).
- Also provide `server/src/scripts/import-csv.js` so I can later load real data from a CSV with the same columns. Document the CSV format in `docs/API.md` or README.

---

## 6. Design direction (this matters a lot)

The site must feel **immersive, editorial, and human-made**. It should NOT look like a typical AI-generated or template SaaS site.

### Hard "do not" list
- No purple/blue-to-pink gradients, no neon glows, no glassmorphism blur cards stacked on gradient blobs.
- No generic three-column "feature cards with emoji icons" sections. No emoji as icons anywhere.
- No Inter / Roboto / Poppins as the main face. No default Tailwind blue buttons or default shadows.
- No stock hero with centered text over a blurred gradient. No "Unlock your potential" style copy.
- No identical rounded-2xl cards repeated in a perfect uniform grid for every section. Vary rhythm and scale.

### Art direction: "a well-printed campus prospectus, brought to life"
Think of a beautifully designed university brochure or a travel magazine: warm paper tones, confident typography, big numbers, hairline rules, and a few unexpected moments.

**Palette** (define as CSS variables and Tailwind theme colors):
- `--paper: #F4EFE6` (page background, warm off-white)
- `--paper-2: #EAE3D6` (panels)
- `--ink: #14171A` (text)
- `--ink-soft: #4A4F55`
- `--forest: #0F3D3E` (primary dark surface)
- `--vermilion: #E4572E` (single bold accent for CTAs and highlights)
- `--marigold: #F2B134` (secondary accent, used sparingly, e.g. rating stars/badges)
- `--rule: rgba(20,23,26,.14)` (hairlines)
Provide a dark "forest" section theme for contrast bands. Check text contrast (WCAG AA).

**Typography** (install via `@fontsource` packages so it works offline):
- Display: **Fraunces** (variable, use optical size and soft/wonk axes for personality) for headlines and big numerals.
- UI/body: **Instrument Sans** (or **Hanken Grotesk**).
- Data/labels: **IBM Plex Mono** for tiny labels, stats, and table headers.
- Use a real type scale with very large display sizes (hero headline 72–140px on desktop, fluid via `clamp()`), tight tracking on display, generous line-height on body.

**Layout and composition**
- 12-column grid with deliberate asymmetry. Use hairline rules (1px) and generous whitespace. Allow some elements to bleed off the grid or overlap.
- Big numerals as graphic elements (e.g. "₹2.5 Cr" highest package set huge in Fraunces).
- Sticky, minimal top bar: wordmark left, a few text links, shortlist counter right. No heavy nav mega-menus; the course/city picker is the hero.

**Immersive moments (build these, keep them performant)**
1. **Hero:** an oversized serif headline with one word swapping through courses ("Find your *B.Tech*." → *MBA*, *Law*, *Design*…), and below it a single large "sentence builder" search: *"I want to study [course ▾] in [city ▾] with fees under [₹ ▾]"* that routes to `/colleges` with filters set. This is the signature interaction.
2. **City postcards:** a horizontally scrolling (drag + wheel) strip of city cards. Each city card uses a **generated** illustrated skyline/pattern in SVG (original, abstract, not photos) tinted by the city's colour, with the number of colleges. Hover tilts slightly and reveals "Explore →".
3. **Generated college covers:** do NOT hotlink logos or photos (copyright and broken-link risk). In `client/src/lib/cover.js`, deterministically generate a cover for each college from `brand_hue` + name: layered geometric/arch shapes, a subtle grain texture (SVG `feTurbulence`), and a large monogram in Fraunces. Each college must look distinct but cohesive.
4. **Scroll storytelling:** one section where stats (colleges listed, cities, courses, exams) count up as you scroll, set in big serif numerals on the forest background.
5. **Page transitions:** short, elegant route transitions (opacity + slight translate, ~250ms) via Motion. Respect `prefers-reduced-motion`.
6. **Detail page:** full-bleed generated cover with the college name overlapping its bottom edge, sticky section tabs (Overview · Courses & Fees · Placements · Exams · Facilities), a horizontal "package bar" visual comparing highest vs average package, and a compact map-like location block (just an SVG pin on a stylised India outline is fine; no map API keys).
7. **Compare tray:** a slim bar that slides up from the bottom when 1+ colleges are selected, showing mini monograms and a "Compare (n)" button.
8. **Micro-interactions:** custom focus rings, press states on buttons, animated underline links, filter chips that morph when toggled, skeleton shimmer. A subtle custom cursor follower is optional and must be disabled on touch devices.

**Copywriting tone:** warm, plain, specific, a little witty. Example: "14 colleges in Pune teach B.Tech. Let's narrow it down." Never corporate filler.

**Responsive + accessible:** mobile-first. Test at 375px, 768px, 1280px, 1920px. Keyboard navigable, visible focus, semantic HTML, alt text/aria labels, `prefers-reduced-motion` honoured, colour is never the only signal. Target Lighthouse Accessibility ≥ 90 and good performance (lazy-load routes and heavy sections, no layout shift).

---

## 7. API contract (document in `docs/API.md`)

Base path `/api`. All responses JSON. Errors: `{ "error": { "code": "...", "message": "..." } }` with correct HTTP status.

- `GET /api/colleges` — query params: `q, course, stream, city, state, ownership, exam, minRating, minFees, maxFees, minPackage, placementVerified, sort, page, pageSize`. Multi-values are comma-separated. Returns `{ items, total, page, pageSize }`.
- `GET /api/colleges/facets` — same filter params; returns counts per facet option given the other filters, plus fee and package min/max.
- `GET /api/colleges/suggest?q=` — top 8 mixed suggestions (colleges, cities, courses).
- `GET /api/colleges/:slug` — full detail including courses+fees, exams, facilities, and 4 similar colleges.
- `GET /api/compare?slugs=a,b,c` — normalised comparison payload (max 3).
- `GET /api/meta` — courses, streams, cities, states, exams for pickers.
- `GET /api/exams` and `GET /api/exams/:slug` — with `stream` filter.
- `GET /api/rankings?course=` — top 20 by a documented scoring formula (rating weighted with placements).
- Auth (`POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`) and shortlist (`GET/POST/DELETE /api/shortlist`) — JWT in httpOnly cookie, bcrypt hashed passwords.
- (Stretch) `POST /api/predictor`, `POST /api/enquiries`.

Backend requirements: zod validation on all inputs, parameterised SQL only (no string-concatenated SQL), `helmet`, `cors` limited to the client origin, `express-rate-limit` on auth and suggest endpoints, central error handler, request logging (`morgan` or `pino-http`), and `GET /api/health`.

---

## 8. Quality bar

- **API tests (vitest + supertest):** cover at least — no-filter listing, single filter, combined filters (course + city + fees), sort order, facet counts consistent with results, pagination bounds, invalid params return 400, unknown slug returns 404.
- **Manual verification checklist** you run yourself before declaring done (write results in `docs/VERIFICATION.md`):
  1. `npm install && npm run seed && npm run dev` works from a clean clone.
  2. Home sentence-builder routes to a filtered listing with the right results.
  3. Every filter in section 4 changes results and the URL; back/forward works; reload preserves state.
  4. Detail page loads for every seeded college (script a loop over all slugs; none may 404 or crash).
  5. Compare with 1, 2, and 3 colleges; trying a 4th shows a friendly message.
  6. Shortlist persists after reload.
  7. Layout is correct at 375 / 768 / 1280 / 1920 px (take screenshots with Playwright if available, otherwise reason through breakpoints carefully).
  8. No console errors or warnings in the browser; no unhandled promise rejections on the server.
- Run ESLint + Prettier and fix issues.

---

## 9. Milestones (do them in order, commit after each)

1. **Foundations** — repo scaffold, root scripts, Express server with `/api/health`, Vite React client with proxy, Tailwind theme + fonts + design tokens, base layout (top bar, footer), `git init` and a `.gitignore`.
2. **Data layer** — schema, seed script with the full sample dataset, repository functions, `/api/meta`.
3. **Search API** — `/api/colleges`, `/facets`, `/suggest`, `/:slug`, `/compare`, with zod validation and tests passing.
4. **Listing page** — filter panel (desktop sidebar + mobile sheet), URL-synced state, sorting, pagination, pills, skeletons, empty state, college result cards with generated covers.
5. **Home page** — sentence-builder hero, city postcards, stream browser, top-rated strip, count-up stats, exams strip.
6. **Detail page + compare + shortlist** — everything in section 2 for these features.
7. **Exams + Rankings pages.**
8. **Auth + server-synced shortlist** (optional but preferred).
9. **Polish pass** — transitions, micro-interactions, a11y audit, responsive audit, copy review, performance (lazy routes, image-free covers, memoisation where useful).
10. **Docs + verification** — README, `docs/API.md`, `docs/DECISIONS.md`, `docs/VERIFICATION.md`; final clean-clone run.

At the end of each milestone, print a short summary: what works, what you decided, what is next.

---

## 10. Conventions

- ES modules everywhere (`"type": "module"`). Node 20+.
- API JSON uses `camelCase`; DB columns use `snake_case`; map between them in the repository layer.
- Money is stored as integer INR; format in the UI with `Intl.NumberFormat('en-IN')`. Packages stored as LPA (number); show "₹2.5 Cr" when ≥ 100 LPA.
- React: function components + hooks, one component per file, colocate small helpers, no prop-drilling beyond two levels (use context or URL state).
- Server state via TanStack Query only (no manual `useEffect` fetching). Filter state lives in the URL (`useSearchParams`), not in component state.
- Commit messages: imperative, short (`Add facet counts endpoint`).
- If you add a dependency, note why in `docs/DECISIONS.md`.

---

## 11. Definition of done

A person can clone the repo, run `npm install`, `npm run seed`, `npm run dev`, open `http://localhost:5173`, pick "B.Tech" and "Pune" in the hero sentence, land on a fast, beautiful, filterable list of real-named colleges, narrow by fees and exams with live counts, open a detail page, compare three colleges, and shortlist them, on both phone and desktop, with zero console errors and tests passing.
