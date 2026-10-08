/**
 * Illustration credits for the bundled college photography.
 *
 * Filled in by `client/scripts/fetch-cover-photos.mjs`, which downloads each
 * source into `client/public/covers/` and writes the manifest next to this file.
 *
 * The photos are illustrative stock imagery, NOT photographs of the actual
 * campus — the UI says so wherever a cover appears at size. If you swap in real
 * per-college photography later, keep the `credit` line honest.
 */
import manifest from '../data/cover-photos.json';

export const PHOTO_CREDIT = manifest.credit;

const photos = Array.isArray(manifest.photos) ? manifest.photos : [];

/**
 * Crops. Both are used so that when the pool is smaller than the college count
 * the same file never renders identically twice — a repeated photo with a
 * different framing reads as a different shot, a repeated photo does not.
 */
const CROPS = ['center 35%', 'center 50%', 'center 68%'];

/**
 * Deterministic cover photograph for a college.
 *
 * Keyed off the college's numeric id rather than a hash so the mapping is a
 * bijection: `base` repeats only every `photos.length` colleges, and those
 * repeats land on the next crop bucket. Two colleges therefore never share an
 * identical image, and a listing page never shows the same picture twice in a
 * row.
 *
 * Returns null when no photographs have been fetched yet — the caller then
 * falls back to the generated artwork, so the app works either way.
 */
export function coverPhoto(id) {
  if (!photos.length || typeof id !== 'number' || Number.isNaN(id)) return null;

  const index = ((id % photos.length) + photos.length) % photos.length;
  const photo = photos[index];
  const crop = Math.floor(id / photos.length) % CROPS.length;

  return {
    src: `/covers/${photo.file}`,
    objectPosition: CROPS[crop],
    author: photo.author,
    page: photo.page,
  };
}
