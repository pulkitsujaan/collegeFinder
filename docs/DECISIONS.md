# Decisions

A running log of choices made while building the CollegeDost prototype, and why.
Newest entries at the bottom.

---

## M1 — Foundations

**npm workspaces instead of nested installs.**
`server/` and `client/` are npm workspaces of the root package. One `npm install`
at the repo root installs everything, which is what the "clean clone" definition
of done requires. Root scripts delegate with `--workspace`.

**Express app is built by `createApp()`, separate from the listener.**
`server/src/app.js` exports `createApp()`, `server/src/index.js` only calls
`listen()`. Supertest needs an app object without a bound port; without this
split the API tests would have to spawn a real server.

**`bcryptjs` instead of `bcrypt`.**
`bcrypt` is a native addon and needs a compiler toolchain on install. `bcryptjs`
is a pure-JS implementation of the same algorithm, which keeps `npm install`
working on any machine. Slower, but this is a prototype. (Wired up in the auth
milestone.)

**Colours are defined as CSS-variable triplets, not hex, in `tailwind.config.js`.**
Every utility colour resolves to `rgb(var(--x-rgb) / <alpha-value>)`. Two things
this buys: opacity modifiers (`bg-paper/95`) keep working, and a section can
re-map the whole palette by setting new variables. That is how the dark
`.theme-forest` band works — put the class on a section and `bg-paper`,
`text-ink` and `border-rule` inside it come out inverted with no per-element
overrides.

**Tailwind v3 rather than v4.**
v3's `tailwind.config.js` is what the brief describes, and the classic
`postcss` pipeline has the fewest surprises with the `@fontsource` imports we
need. Nothing here depends on v3-only behaviour, so a later move is mechanical.

**Fonts self-hosted via `@fontsource`.**
Fraunces (display), Instrument Sans (UI/body), IBM Plex Mono (labels and data).
Self-hosting means no third-party request, no FOUT from a CDN, and the site
works offline. Fraunces' variable axes (`SOFT`, `WONK`, `opsz`) are set in the
`.font-display` utility.

**Lenis is skipped when it would hurt.**
Momentum scrolling is disabled for `prefers-reduced-motion: reduce` and for
touch devices, where native inertia is already better and Lenis would fight it.
Any element that scrolls internally can opt out with `data-lenis-prevent`.

**Global reduced-motion safety net in `global.css`.**
Rather than remembering to guard every animation, a base rule neutralises
animation and transition durations under `prefers-reduced-motion`. Components
that need something smarter can still override it.

---

## M2 — Data layer

**Reference data is hand-written; college numbers are generated.**
`cities.json`, `courses.json`, `exams.json` and `facilities.json` are written by
hand and reviewed — they are small, and they are what every other table joins
against. The ~90 colleges are assembled by a generator. Not laziness: the brief
says the numbers must be *plausible illustrative values*, and a generator with
tier-aware ranges produces a more believable spread (fees, packages, ratings,
seats) than inventing 90 of them one at a time, and produces them consistently.

**Every course in `courses.json` is taught by at least one college.**
A test asserts it. Seven courses were initially offered by nobody — `mcom`,
`bhms`, `mdes`, `bhm`, `bsc-agri`, `bvsc`, `bsc-animation` — which put a chip in
the stream browser and the filter panel that led to an empty list. The
generation tables (`FEE_BASE`, `SEAT_BASE`, `CUTOFF_SHAPE`,
`ELIGIBILITY_OVERRIDE`, `examsForCourse`) already anticipated all seven, so the
fix was attaching each to a college that genuinely teaches it rather than
deleting the course. They are appended to the end of each `courses` array, never
prepended, because the first entry is the flagship and drives the generated
package profile.

**Generation is deterministic — FNV-1a hash → mulberry32 PRNG, seeded from the slug.**
Every invented number derives from the college's slug, so the "random" values
are a pure function of the name. Two consequences that matter: re-running the
seed gives byte-identical data (so the seed is genuinely idempotent and diffs
stay clean), and a college's generated cover art, brand hue, and stats stay
consistent with each other across runs.

**Facts versus figures.**
Names, cities, states, ownership, and website domains of well-known Indian
institutions are real and were checked. Fees, packages, ratings, seat counts,
cutoffs and campus sizes are invented. Every row carries
`data_source: "sample"`, the listing carries a one-line note, and detail pages
carry a badge. The UI never presents an invented number as verified.

**`applySchema()` drops and recreates every table.**
The seed is a *rebuild*, not a migration — `npm run seed` always leaves you with
exactly the sample dataset. A migration system is not worth its weight in a
prototype with no real users. This is exactly why `import-csv.js` refuses to
call it (below).

**`region_group` on `colleges`, with Delhi-NCR as the first member.**
Students search for "Delhi" but the colleges are in Noida, Gurugram, Ghaziabad,
Faridabad and New Delhi. A nullable `region_group` column lets the city facet
collapse them into one option ("Delhi-NCR (24)") without lying about the city
column. Member cities are excluded from the facet when the group is present.

**SQLite, no ORM, no query builder.**
All SQL lives in `server/src/db/repositories/*.js` as parameterised strings. The
faceted search is a handful of joins and conditional `WHERE` clauses; an ORM
would obscure rather than clarify it, and keeping SQL in one directory is what
makes a later PostgreSQL move mechanical.

---

## M3 — Search API

**Facets are computed by excluding the facet's own filter.**
`buildFilters(input, exclude)` builds the `WHERE` clause once and takes the name
of a dimension to leave out. So the city facet is counted with every filter
applied *except* city — click "Pune" and the other cities' counts drop to what
they would be if you switched, which is the only number that helps you decide.
Doing this per-request rather than caching keeps it honest with zero
invalidation logic.

**Zero-count facet options are returned, not filtered out.**
The panel dims them. An option that silently vanishes when you apply another
filter looks like a bug; a dimmed one teaches you what the filter did.
Each facet is seeded with its full vocabulary before the counts are overlaid, so
`?city=Pilani` still returns all four ownership types — three of them at zero —
and all 27 courses, only BITS Pilani's at a non-zero count. The vocabularies are
`courses.json`, `exams.json` and the ownership enum for the closed lists, and
`SELECT DISTINCT city / state` for the two that only exist because a college
does. That is why the counts are `0` rather than absent, and why the client's
dim-instead-of-hide branch is reachable.

**A separate `/api/colleges/slugs` endpoint.**
The verification checklist requires loading all ~90 detail pages and proving
none 404. That needs the slug list, and deriving it by paging the listing would
be both slow and a lie (it would only ever test the pages the listing exposed).

**Comma-separated multi-values, coerced in the zod schema.**
`?city=Pune,Mumbai` is split and trimmed in one place in `schemas/college.js`
rather than at every call site. A single value and a list of one are the same
input, so the client never has to think about it.

---

## M4 — Listing page

**The URL is the only filter state.**
`useFilterState` reads and writes `useSearchParams`; there is no parallel
`useState` mirror. Back, forward, reload and a pasted link all behave the same
for free. The only thing kept outside the URL is pagination-on-filter-change
(any filter change resets `page` to 1 — otherwise narrowing to 3 results leaves
you stranded on page 4).

**Numbered pagination rather than infinite scroll.**
12 per page, matching the brief's first option. Numbered pages make the total
count meaningful and make a specific page a shareable link; infinite scroll
would break both, and the list is short enough that it is not needed.

**Skeletons, not spinners.**
`CardSkeletonGrid` mirrors the real card's box model so the page does not jump
when data lands. A spinner would collapse the page to one line and then expand
it — the layout shift Lighthouse penalises.

**The mobile sheet applies filters as you tap them.**
"Show results" is a courtesy exit, not the moment the search runs. The live
result count in the sheet footer is only truthful if the filters are already
applied; the alternative is a count that lies until you press a button.

---

## M5 — Home page

**The sentence builder uses real `<select>` elements.**
Styled to look like underlined slots, not like form controls — but they are
native selects. Keyboard navigation, type-ahead, the mobile picker wheel and
screen-reader semantics all come free, and the signature interaction of the
whole site is not the place to hand-roll a listbox.

**The sentence builder's slots are sized by the selected option, not the longest one.**
A `<select>` is intrinsically as wide as its widest `<option>`. The course slot
therefore reserved room for the longest course name in the catalogue and sat
~525px wide while showing "anything" — three slots of that pushed the sentence
onto a second line and left it full of dashed dead space. Each slot now renders
an `aria-hidden` span of the selected label, which does the sizing, with the real
select laid over it at `inset-0` and `opacity-0`. The native picker wheel,
type-ahead, keyboard handling and screen-reader semantics are untouched; only the
box the browser gives the select changed. The form also spans the full shell
rather than stopping at `max-w-4xl`, and the type is
`clamp(1.25rem, 2vw, 2.1rem)` — one line from about 730px up. Deliberately *not*
`whitespace-nowrap`: a phone, or a 32-character course name, wraps rather than
scrolling the page sideways.

**`.theme-forest` inverts the tokens, so role names carry the colour.**
Inside the dark band `--paper` *is* the forest colour and `--ink` *is* the paper
colour, which keeps `bg-paper` / `text-ink` / `border-rule` correct without any
`dark:` variants. The trap is that `text-paper` still reads as "light text" while
painting forest on forest: the stats band and the login aside both did this, so
the count-up numerals rendered at contrast 1:1 — present in the DOM, invisible on
screen, and silent to every test. Both now inherit the band's colour or use
`text-ink-soft` / `text-ink-faint`, and `tokens.css` says so at the definition.
For a forest-coloured box on a *light* page — the toast and the compare tray —
the fixed `bg-forest` with `text-paper` is correct; do not add `.theme-forest`
there.

**The swapping headline reserves its width from the longest word.**
An invisible copy of the widest course name ("Hotel Management") sits in the
flow, so the line does not reflow as words swap. Without it the entire hero
shifts sideways every 2.4 seconds.

**City postcards are generated SVG skylines, never photographs.**
`lib/postcard.js` derives a skyline — building widths, heights, window grids, a
dome, a sun — from a hash of the city name, tinted by the city's hue. Same
reasoning as the college covers: nothing to license, nothing to hotlink, nothing
to 404, and the set still looks deliberate.

---

## M6 — Detail page, compare, shortlist

**The location block is a lat/long graticule, not a map of India.**
The brief suggested "an SVG pin on a stylised India outline". Drawing a national
border means taking a position on where that border runs, and this project has
no business making that claim for a prototype's decoration. A two-line
graticule with the actual coordinates labelled does the same job — it tells you
roughly where the campus is — and says nothing it cannot back up. The block is
labelled "Approximate coordinates — not a survey".

**Compare and shortlist both persist to localStorage under namespaced keys.**
`lib/storage.js` owns the keys and wraps reads in try/catch (a private window
throws on access). localStorage is the source of truth while signed out; after
sign-in the server copy wins (see M8).
**`/compare` hydrates from `?slugs=` and then clears the parameter.**
A shared compare link has to work for someone whose tray is empty. But once the
API responds, the URL would otherwise be a second, staler source of truth than
the tray — remove a college and the link you are looking at still lists it. So
the page adopts the slugs into the tray and drops the query string. One source
of truth, and the link still works.

---

## M7 — Exams and rankings

**Exam streams are their own vocabulary in `/api/meta`.**
The exams page initially filtered on the course streams. But an exam's stream
list is smaller and different (no "Aviation", no "Veterinary"), so chips built
from course streams could lead to an empty list. `/api/meta` now returns
`examStreams` derived from `SELECT stream FROM exams GROUP BY stream`, which
guarantees every chip has at least one exam behind it.

**The ranking score is published in the API response.**
`GET /api/rankings` returns the formula string it used alongside the ranks, and
the page prints it under the heading. A ranking whose method is hidden is just
an assertion; here a student can see that placement data is weighted, that the
packages are capped, and that verified placements get a 3% nudge.

---

## M8 — Auth

**JWT in an httpOnly cookie, not in localStorage.**
An httpOnly cookie is not readable by JavaScript, so an XSS bug cannot walk off
with the session. `SameSite=Lax` plus a CORS allow-list (with `credentials`)
covers the CSRF direction for the prototype; `secure` is switched on in
production.

**One message for both wrong-password and unknown-email.**
Both return "That email and password do not match." Distinct messages turn the
login endpoint into a free account-enumeration oracle. The test asserts the two
responses are literally identical strings.

**Signing in merges the local shortlist rather than replacing it.**
The union of what is in the browser and what is on the server is uploaded, so
nothing a student saved while signed out is lost. `GET /api/shortlist` then
becomes the source of truth and the context is replaced with the server's list.
The cost is that clearing a shortlist on the server can be undone by a stale
browser — acceptable for a prototype, and noted here for the real thing.

**`bcryptjs` at 10 rounds.**
See M1. 10 rounds is the common default; a prototype's seed data does not
warrant slowing every login to defend against an attacker who already has the
database file.

---

## M9 — Polish

**Lenis does not intercept wheel events globally.**
An earlier version stopped propagation on every wheel event at the document
level to hand scroll control to Lenis. That also swallowed the events before
elements with `data-lenis-prevent` could see them, which broke the filter
sidebar and the city strip. Lenis already honours the attribute; the listener
was both redundant and harmful, so it is gone.

**Every route is `lazy()`, with one Suspense boundary in `SiteLayout`.**
Nine routes split into nine chunks on a page whose payload is otherwise tiny.
One boundary rather than one per route so the chrome — top bar, compare tray,
footer — never unmounts during a navigation, which is what makes the page
transition read as a transition rather than a rebuild.

## Deployment (Vercel + Render)

**The client reads its API origin from `VITE_API_URL`, falling back to `/api`.**
Left unset, the Vite proxy handles local dev and nothing changes. Set to the
Render origin at build time, `api/client.js` prefixes every request with it. One
constant, no per-environment branching in the hooks.

**The session cookie's `SameSite` is configuration, not a constant.**
Vercel and Render are different sites, so a `Lax` cookie would never be sent on
the cross-site fetch and sign-in would silently fail in production. `COOKIE_SAME_SITE`
defaults to `none` when `NODE_ENV=production` and `lax` otherwise, keeping dev
over http on localhost working (browsers reject `None` without `Secure`).

**The server re-seeds on boot when the database file is absent.**
`render.yaml` already seeds during the build, but Render's free tier has an
ephemeral disk, so a restarted or redeployed instance can boot with no SQLite
file. The check is one `SELECT COUNT(*)` and the seed takes ~100 ms, which buys
an API that is never up-but-empty.
