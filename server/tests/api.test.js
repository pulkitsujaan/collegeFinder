/**
 * API tests for the search surface.
 *
 * The suite seeds its own database (server/data/test.sqlite, gitignored) once
 * before anything runs, then exercises the real Express app through supertest —
 * no mocked repositories, so a broken SQL join fails the tests.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { seed } from '../src/scripts/seed.js';
import { closeDb } from '../src/db/connection.js';

let app;

beforeAll(() => {
  seed();
  app = createApp();
});

afterAll(() => {
  closeDb();
});

describe('GET /api/health', () => {
  it('reports a seeded database', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('seeded');
  });
});

describe('GET /api/colleges — listing', () => {
  it('returns a default page of 12 with a total', async () => {
    const res = await request(app).get('/api/colleges').expect(200);
    expect(res.body.items).toHaveLength(12);
    expect(res.body.total).toBeGreaterThanOrEqual(80);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(12);
    expect(res.body.items[0]).toMatchObject({
      slug: expect.any(String),
      name: expect.any(String),
      city: expect.any(String),
      dataSource: 'sample',
    });
  });

  it('filters by a single city', async () => {
    const res = await request(app).get('/api/colleges?city=Pune').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.city).toBe('Pune');
    }
  });

  it('treats Delhi-NCR as one grouped city', async () => {
    const res = await request(app).get('/api/colleges?city=Delhi-NCR&pageSize=48').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    const cities = new Set(res.body.items.map((item) => item.regionGroup));
    expect([...cities]).toEqual(['Delhi-NCR']);
  });

  it('combines course + city + fee filters with AND logic', async () => {
    const res = await request(app)
      .get('/api/colleges?course=btech&city=Pune&maxFees=1500000&pageSize=48')
      .expect(200);

    expect(res.body.total).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.city).toBe('Pune');
      expect(item.minFeesInr).toBeLessThanOrEqual(1500000);
      expect(item.courseNames).toContain('B.Tech / B.E.');
    }
  });

  it('filters by ownership and minimum rating together', async () => {
    const res = await request(app)
      .get('/api/colleges?ownership=Government&minRating=8.5&pageSize=48')
      .expect(200);
    for (const item of res.body.items) {
      expect(item.ownership).toBe('Government');
      expect(item.rating).toBeGreaterThanOrEqual(8.5);
    }
  });

  it('filters by entrance exam', async () => {
    const res = await request(app).get('/api/colleges?exam=clat&pageSize=48').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('returns an empty page rather than an error when nothing matches', async () => {
    const res = await request(app).get('/api/colleges?q=zzzznotacollege').expect(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /api/colleges — sorting', () => {
  it('sorts by rating descending', async () => {
    const res = await request(app).get('/api/colleges?sort=rating&pageSize=24').expect(200);
    const ratings = res.body.items.map((item) => item.rating);
    expect([...ratings].sort((a, b) => b - a)).toEqual(ratings);
  });

  it('sorts by highest package descending', async () => {
    const res = await request(app)
      .get('/api/colleges?sort=highest_package&pageSize=24')
      .expect(200);
    const packages = res.body.items.map((item) => item.highestPackageLpa);
    expect([...packages].sort((a, b) => b - a)).toEqual(packages);
  });

  it('sorts by fees ascending and descending', async () => {
    const asc = await request(app).get('/api/colleges?sort=fees_asc&pageSize=24').expect(200);
    const ascFees = asc.body.items.map((item) => item.minFeesInr);
    expect([...ascFees].sort((a, b) => a - b)).toEqual(ascFees);

    const desc = await request(app).get('/api/colleges?sort=fees_desc&pageSize=24').expect(200);
    const descFees = desc.body.items.map((item) => item.minFeesInr);
    expect([...descFees].sort((a, b) => b - a)).toEqual(descFees);
  });

  it('puts a name search match first under relevance sorting', async () => {
    const res = await request(app).get('/api/colleges?q=iit%20delhi').expect(200);
    expect(res.body.items[0].slug).toBe('iit-delhi');
  });
});

describe('GET /api/colleges — pagination', () => {
  it('returns different items on page 2', async () => {
    const first = await request(app).get('/api/colleges?sort=name&page=1').expect(200);
    const second = await request(app).get('/api/colleges?sort=name&page=2').expect(200);
    expect(second.body.page).toBe(2);
    const firstSlugs = first.body.items.map((item) => item.slug);
    const secondSlugs = second.body.items.map((item) => item.slug);
    expect(secondSlugs.some((slug) => firstSlugs.includes(slug))).toBe(false);
  });

  it('returns an empty array past the last page without erroring', async () => {
    const res = await request(app).get('/api/colleges?page=9999').expect(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('rejects page=0, pageSize=0 and pageSize above the cap', async () => {
    await request(app).get('/api/colleges?page=0').expect(400);
    await request(app).get('/api/colleges?pageSize=0').expect(400);
    await request(app).get('/api/colleges?pageSize=500').expect(400);
  });
});

describe('GET /api/colleges — invalid parameters', () => {
  it('rejects an unknown sort', async () => {
    const res = await request(app).get('/api/colleges?sort=banana').expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.details[0].field).toBe('sort');
  });

  it('rejects a non-numeric numeric filter', async () => {
    const res = await request(app).get('/api/colleges?minRating=abc').expect(400);
    expect(res.body.error.details[0].field).toBe('minRating');
  });

  it('rejects a rating above the 0-10 scale', async () => {
    await request(app).get('/api/colleges?minRating=42').expect(400);
  });

  it('rejects an unknown ownership value', async () => {
    await request(app).get('/api/colleges?ownership=Banana').expect(400);
  });
});

describe('GET /api/colleges/facets', () => {
  it('returns counts and ranges', async () => {
    const res = await request(app).get('/api/colleges/facets').expect(200);
    expect(res.body.city.length).toBeGreaterThan(10);
    expect(res.body.course.length).toBeGreaterThan(10);
    expect(res.body.stream.length).toBeGreaterThan(5);
    expect(res.body.ranges.fees.min).toBeGreaterThan(0);
    expect(res.body.ranges.fees.max).toBeGreaterThan(res.body.ranges.fees.min);
  });

  it('groups Delhi-NCR into one option and hides its member cities', async () => {
    const res = await request(app).get('/api/colleges/facets').expect(200);
    const values = res.body.city.map((option) => option.value);
    expect(values).toContain('Delhi-NCR');
    expect(values).not.toContain('Noida');
    expect(values).not.toContain('Gurugram');
  });

  it('keeps facet counts consistent with the listing for the same filters', async () => {
    const listing = await request(app).get('/api/colleges?city=Pune&pageSize=48').expect(200);
    const facets = await request(app).get('/api/colleges/facets').expect(200);
    const puneOption = facets.body.city.find((option) => option.value === 'Pune');
    expect(puneOption.count).toBe(listing.body.total);
  });

  it('counts facets against the other active filters', async () => {
    const filtered = await request(app).get('/api/colleges?course=btech&pageSize=48').expect(200);
    const facets = await request(app).get('/api/colleges/facets?course=btech').expect(200);
    const btechOption = facets.body.course.find((option) => option.value === 'btech');
    // The course facet ignores its own filter, so it should report the full
    // number of B.Tech colleges, not the narrowed count.
    expect(btechOption.count).toBeGreaterThanOrEqual(filtered.body.total);
  });

  it('returns every option even when a filter zeroes it out', async () => {
    const all = await request(app).get('/api/colleges/facets').expect(200);
    const pilani = await request(app).get('/api/colleges/facets?city=Pilani').expect(200);

    // Pilani holds exactly one college, so the option list must survive the
    // narrowing with the other three ownership types dimmed at zero.
    expect(pilani.body.ownership.map((option) => option.value)).toEqual(
      all.body.ownership.map((option) => option.value),
    );
    expect(pilani.body.ownership.filter((option) => option.count === 0)).toHaveLength(3);
    expect(pilani.body.ownership.find((option) => option.value === 'Private').count).toBe(1);

    // Same for courses: a chip that leads nowhere is still listed, at 0.
    expect(pilani.body.course).toHaveLength(all.body.course.length);
    expect(pilani.body.course.some((option) => option.count === 0)).toBe(true);
  });
});

describe('GET /api/colleges/suggest', () => {
  it('returns mixed suggestions for a city query', async () => {
    const res = await request(app).get('/api/colleges/suggest?q=pune').expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.map((item) => item.type)).toContain('city');
  });

  it('returns college suggestions for a name query', async () => {
    const res = await request(app).get('/api/colleges/suggest?q=bombay').expect(200);
    expect(res.body.items.some((item) => item.slug === 'iit-bombay')).toBe(true);
  });

  it('requires a query', async () => {
    await request(app).get('/api/colleges/suggest').expect(400);
  });
});

describe('GET /api/colleges/:slug — detail', () => {
  it('returns the full detail payload', async () => {
    const res = await request(app).get('/api/colleges/iit-bombay').expect(200);
    expect(res.body).toMatchObject({
      slug: 'iit-bombay',
      name: 'Indian Institute of Technology Bombay',
      city: 'Mumbai',
      ownership: 'Government',
      dataSource: 'sample',
    });
    expect(res.body.courses.length).toBeGreaterThan(0);
    expect(res.body.courses[0]).toHaveProperty('totalFeesInr');
    expect(res.body.exams.length).toBeGreaterThan(0);
    expect(res.body.facilities.length).toBeGreaterThan(0);
    expect(res.body.similar).toHaveLength(4);
    expect(res.body.feeRange.min).toBeLessThanOrEqual(res.body.feeRange.max);
  });

  it('404s for an unknown slug', async () => {
    const res = await request(app).get('/api/colleges/not-a-real-college').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('400s for a slug with illegal characters', async () => {
    await request(app).get('/api/colleges/IIT%20Bombay!').expect(400);
  });

  it('loads every seeded college without a 404 or a server error', async () => {
    const { body } = await request(app).get('/api/colleges/slugs').expect(200);
    expect(body.slugs.length).toBeGreaterThanOrEqual(80);

    const failures = [];
    for (const slug of body.slugs) {
      const res = await request(app).get(`/api/colleges/${slug}`);
      if (res.status !== 200) failures.push(`${slug} → ${res.status}`);
    }
    expect(failures).toEqual([]);
  });

  it('every seeded college has a coherent fee range and rating', async () => {
    const { body } = await request(app).get('/api/colleges?pageSize=48&page=1').expect(200);
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(item.rating).toBeGreaterThanOrEqual(0);
      expect(item.rating).toBeLessThanOrEqual(10);
      expect(item.avgPackageLpa).toBeLessThanOrEqual(item.highestPackageLpa);
    }
  });
});

describe('GET /api/compare', () => {
  it('compares two colleges and returns comparison rows', async () => {
    const res = await request(app).get('/api/compare?slugs=iit-bombay,iit-delhi').expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.rows.length).toBeGreaterThan(5);
    expect(res.body.rows.map((row) => row.key)).toContain('highestPackageLpa');
    expect(res.body.maxCompare).toBe(3);
  });

  it('compares three colleges', async () => {
    const res = await request(app)
      .get('/api/compare?slugs=iit-bombay,iit-delhi,iit-madras')
      .expect(200);
    expect(res.body.items).toHaveLength(3);
  });

  it('rejects four colleges with a helpful message', async () => {
    const res = await request(app)
      .get('/api/compare?slugs=iit-bombay,iit-delhi,iit-madras,iit-kanpur')
      .expect(400);
    expect(res.body.error.message).toMatch(/up to 3/i);
  });

  it('requires at least one slug', async () => {
    await request(app).get('/api/compare').expect(400);
  });

  it('404s when no slug matches', async () => {
    await request(app).get('/api/compare?slugs=nope,nada').expect(404);
  });
});

describe('GET /api/meta', () => {
  it('returns pickers with counts and totals', async () => {
    const res = await request(app).get('/api/meta').expect(200);
    expect(res.body.courses.length).toBeGreaterThanOrEqual(12);
    expect(res.body.cities.length).toBeGreaterThanOrEqual(12);
    expect(res.body.states.length).toBeGreaterThanOrEqual(10);
    expect(res.body.exams.length).toBeGreaterThanOrEqual(20);
    expect(res.body.totals.colleges).toBeGreaterThanOrEqual(80);
    for (const course of res.body.courses) {
      expect(course.count).toBeGreaterThan(0);
    }
  });

  it('exposes exam streams separately from course streams', async () => {
    const res = await request(app).get('/api/meta').expect(200);
    expect(res.body.examStreams.length).toBeGreaterThan(0);
    for (const stream of res.body.examStreams) {
      // Every chip the exams page renders must lead somewhere.
      expect(stream.count).toBeGreaterThan(0);
    }
  });
});

describe('GET /api/exams', () => {
  it('lists at least 20 exams with dates', async () => {
    const res = await request(app).get('/api/exams').expect(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(20);
    const jee = res.body.items.find((exam) => exam.slug === 'jee-main');
    expect(jee.examDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(jee.collegeCount).toBeGreaterThan(0);
  });

  it('filters exams by stream', async () => {
    const res = await request(app).get('/api/exams?stream=Management').expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const exam of res.body.items) expect(exam.stream).toBe('Management');
  });

  it('returns one exam with its colleges, and 404s on an unknown slug', async () => {
    const res = await request(app).get('/api/exams/cat').expect(200);
    expect(res.body.name).toBe('CAT');
    expect(res.body.colleges.length).toBeGreaterThan(0);
    await request(app).get('/api/exams/not-an-exam').expect(404);
  });
});

describe('auth + shortlist', () => {
  const email = 'test.student@example.com';
  const password = 'a-long-enough-passphrase';

  it('says nobody is signed in when there is no cookie', async () => {
    const res = await request(app).get('/api/auth/me').expect(200);
    expect(res.body.user).toBeNull();
  });

  it('registers, sets an httpOnly cookie, and never returns the hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password, name: 'Test Student' })
      .expect(201);

    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookie = res.headers['set-cookie']?.join(';') ?? '';
    expect(cookie).toContain('collegedost_token=');
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('rejects a second account on the same email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects a short password and a malformed email', async () => {
    await request(app).post('/api/auth/register').send({ email: 'nope', password }).expect(400);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'definitely-not-it' })
      .expect(401);

    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password })
      .expect(401);

    // Identical wording, so the endpoint cannot be used to enumerate accounts.
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('signs in and syncs a shortlist that survives a new session', async () => {
    const agent = request.agent(app);

    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/login').send({ email, password }).expect(200);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe(email);

    const saved = await agent.post('/api/shortlist').send({ slug: 'iit-bombay' }).expect(201);
    expect(saved.body.slugs).toContain('iit-bombay');
    expect(saved.body.items[0].name).toMatch(/Bombay/);

    // Adding twice is a no-op, not a duplicate.
    await agent.post('/api/shortlist').send({ slug: 'iit-bombay' }).expect(201);
    const listed = await agent.get('/api/shortlist').expect(200);
    expect(listed.body.slugs.filter((slug) => slug === 'iit-bombay')).toHaveLength(1);

    // A fresh agent with only the cookie sees the same list.
    const fresh = request.agent(app);
    await fresh.get('/api/auth/me').expect(200);
    await fresh.post('/api/auth/login').send({ email, password }).expect(200);
    const second = await fresh.get('/api/shortlist').expect(200);
    expect(second.body.slugs).toContain('iit-bombay');

    const removed = await fresh.delete('/api/shortlist/iit-bombay').expect(200);
    expect(removed.body.slugs).not.toContain('iit-bombay');
  });

  it('refuses the shortlist without a session', async () => {
    await request(app).get('/api/shortlist').expect(401);
    await request(app).post('/api/shortlist').send({ slug: 'iit-bombay' }).expect(401);
  });

  it('404s when the slug is not a college, and clears the cookie on logout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email, password }).expect(200);
    await agent.post('/api/shortlist').send({ slug: 'not-a-college' }).expect(404);

    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/shortlist').expect(401);
  });
});

describe('GET /api/rankings', () => {
  it('ranks B.Tech colleges by the documented score', async () => {
    const res = await request(app).get('/api/rankings?course=btech').expect(200);
    expect(res.body.items.length).toBe(20);
    const scores = res.body.items.map((item) => item.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(res.body.formula).toMatch(/rating/);
  });

  it('returns a different order for a different course', async () => {
    const btech = await request(app).get('/api/rankings?course=btech').expect(200);
    const mba = await request(app).get('/api/rankings?course=mba').expect(200);
    expect(btech.body.items[0].slug).not.toBe(mba.body.items[0].slug);
  });
});

describe('unknown routes', () => {
  it('404s with the standard error shape', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
