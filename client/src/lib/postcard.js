import { hashString, makeRng } from './cover.js';

/**
 * City postcards.
 *
 * Same idea as the college covers: the skyline is drawn, not photographed, so
 * there is nothing to license and nothing to 404. Each city gets a stable
 * silhouette and a tint derived from its name, and cities in the same state
 * tend to land on nearby hues.
 */

/** Deterministic hue per city — evenly spread, so no two neighbours collide. */
export function cityHue(name) {
  return hashString(`city:${name}`) % 360;
}

/**
 * Buildings plus a landmark: one taller tower, one dome. Drawn on a 200×120
 * canvas with the ground at y = 120.
 */
export function skyline(name, { columns = 9 } = {}) {
  const rng = makeRng(hashString(`skyline:${name}`));
  const slot = 200 / columns;
  const buildings = [];

  for (let i = 0; i < columns; i += 1) {
    const width = slot * (0.6 + rng() * 0.32);
    const height = 22 + rng() * 74;
    buildings.push({
      x: i * slot + (slot - width) / 2,
      width,
      height,
      // A few flat roofs, most with a stepped top — reads as a real skyline
      // rather than a bar chart.
      step: rng() < 0.45 ? 0 : 1,
      windows: rng() < 0.5,
      accent: rng() < 0.18,
    });
  }

  return {
    buildings,
    dome: { x: 24 + rng() * 152, r: 7 + rng() * 5 },
    sun: { x: 16 + rng() * 168, y: 22 + rng() * 26, r: 9 + rng() * 6 },
  };
}

/** Palette for a postcard: a warm sky over deep silhouettes. */
export function postcardPalette(hue) {
  const h = ((hue % 360) + 360) % 360;
  return {
    sky: `hsl(${h} 34% 88%)`,
    skyLow: `hsl(${(h + 22) % 360} 40% 78%)`,
    back: `hsl(${h} 26% 62%)`,
    front: `hsl(${(h + 350) % 360} 36% 26%)`,
    ink: `hsl(${(h + 344) % 360} 42% 16%)`,
    accent: `hsl(${(h + 40) % 360} 72% 54%)`,
  };
}
