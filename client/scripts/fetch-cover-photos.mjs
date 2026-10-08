/**
 * Fetch the bundled college cover photography.
 *
 *   npm run covers            (from the repo root)
 *   node client/scripts/fetch-cover-photos.mjs
 *
 * Reads the curated source list in `client/src/data/cover-photo-sources.json`,
 * downloads each photo into `client/public/covers/` as a fixed-size JPEG, and
 * writes `client/src/data/cover-photos.json` — the manifest the app reads.
 *
 * Photos are bundled rather than hotlinked on purpose: no third-party request
 * per card, no broken images when a CDN moves, and the app works offline. The
 * script is idempotent — an already-downloaded file is left alone, so re-running
 * it after adding a few sources only fetches the new ones.
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const clientDir = join(here, '..');
const sourcesPath = join(clientDir, 'src/data/cover-photo-sources.json');
const manifestPath = join(clientDir, 'src/data/cover-photos.json');
const outDir = join(clientDir, 'public/covers');

// 1200×800 is the largest a cover is ever displayed (full-bleed detail hero at
// 2× on a laptop), and q=72 keeps each file around 80–120 KB.
const WIDTH = 1200;
const HEIGHT = 800;
const QUALITY = 72;

const CREDIT = 'Photographs are illustrative stock images, not pictures of the actual campus.';

const pad = (n) => String(n).padStart(2, '0');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Strip Unsplash's own sizing params and ask for the exact render we want. */
function renderUrl(raw) {
  const url = new URL(raw);
  url.search = '';
  url.searchParams.set('fm', 'jpg');
  url.searchParams.set('fit', 'crop');
  url.searchParams.set('w', String(WIDTH));
  url.searchParams.set('h', String(HEIGHT));
  url.searchParams.set('q', String(QUALITY));
  return url.toString();
}

async function main() {
  const { sources } = JSON.parse(await readFile(sourcesPath, 'utf8'));

  if (!Array.isArray(sources) || sources.length === 0) {
    console.error('No sources listed in src/data/cover-photo-sources.json — nothing to do.');
    process.exitCode = 1;
    return;
  }

  await mkdir(outDir, { recursive: true });

  const photos = [];
  let downloaded = 0;
  let skipped = 0;

  for (const [index, source] of sources.entries()) {
    const file = `campus-${pad(index + 1)}.jpg`;
    const target = join(outDir, file);

    if (await exists(target)) {
      skipped += 1;
    } else {
      const response = await fetch(renderUrl(source.url));
      if (!response.ok) {
        console.error(`  ✗ ${file} — HTTP ${response.status} for ${source.url}`);
        process.exitCode = 1;
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < 5_000) {
        console.error(`  ✗ ${file} — response too small to be a photo, skipped`);
        process.exitCode = 1;
        continue;
      }
      await writeFile(target, buffer);
      downloaded += 1;
      // Be a polite guest on someone else's CDN.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    photos.push({
      file,
      author: source.author ?? null,
      page: source.page ?? null,
    });
  }

  await writeFile(
    manifestPath,
    `${JSON.stringify({ credit: CREDIT, photos }, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `Covers: ${downloaded} downloaded, ${skipped} already present, ${photos.length} in the manifest.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
