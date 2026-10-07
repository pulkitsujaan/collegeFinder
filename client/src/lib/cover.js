/**
 * Generated cover art.
 *
 * We never hotlink a college's logo or photos — copyright, broken links and
 * layout shift all at once. Instead each college gets a deterministic geometric
 * cover derived from its `brand_hue` and slug: layered arches, hairline rules,
 * a grain texture and a monogram. Same college, same cover, every time; two
 * colleges in one city read as a family but never look identical.
 */

/** FNV-1a, so the art is stable across reloads and machines. */
export function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Palette derived from a single hue. Saturation and lightness are pinned so the
 * covers stay inside the printed-prospectus look rather than drifting neon.
 */
export function coverPalette(hue) {
  const h = ((hue % 360) + 360) % 360;
  return {
    sky: `hsl(${h} 26% 90%)`,
    skyDeep: `hsl(${(h + 18) % 360} 24% 82%)`,
    mid: `hsl(${h} 30% 62%)`,
    deep: `hsl(${(h + 340) % 360} 34% 30%)`,
    ink: `hsl(${(h + 335) % 360} 40% 18%)`,
    accent: `hsl(${(h + 32) % 360} 68% 52%)`,
  };
}

/**
 * The arch rhythm for a cover: a row of gateway arches whose heights, widths
 * and accents are all driven by the slug.
 */
export function coverLayout(slug, { columns = 6 } = {}) {
  const rng = makeRng(hashString(slug));
  const arches = [];
  for (let i = 0; i < columns; i += 1) {
    arches.push({
      width: 0.6 + rng() * 0.9,
      height: 0.3 + rng() * 0.62,
      offset: (rng() - 0.5) * 0.12,
      accent: rng() < 0.22,
      rule: rng() < 0.5,
    });
  }
  return {
    arches,
    horizon: 0.62 + rng() * 0.12,
    sun: { x: 0.12 + rng() * 0.76, y: 0.12 + rng() * 0.3, r: 0.03 + rng() * 0.05 },
    rotation: (rng() - 0.5) * 6,
  };
}

/** One to three initials: "Indian Institute of Technology Bombay" → "IITB". */
export function monogram(name, shortName) {
  const source = (shortName || name || '?').trim();
  const words = source.split(/[\s.]+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  // Initials read better than three letters of the first word for multi-word
  // names, but stop at four so "Shri Govindram Seksaria Institute..." is SG.
  const initials = words
    .filter((word) => !/^(of|and|the|for|at|in|de)$/i.test(word))
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return initials.slice(0, 4);
}

/** Text colour that stays legible on a given hsl lightness. */
export function readableInk(palette) {
  return palette.ink;
}
