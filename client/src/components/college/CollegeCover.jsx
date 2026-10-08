import { useState } from 'react';

import { coverLayout, coverPalette, hashString, monogram } from '../../lib/cover.js';
import { coverPhoto } from '../../lib/coverPhotos.js';

/**
 * A college's cover.
 *
 * Two layers, and the order matters. Underneath is the generated artwork from
 * `lib/cover.js` — layered arches, a horizon, hairline rules and grain, derived
 * from the slug and `brand_hue`. On top sits a bundled photograph, tinted back
 * toward the same hue so a wall of covers still reads as one family.
 *
 * The artwork is never removed: it is the placeholder while the photo loads, the
 * fallback if the file is missing, and the picture for any college the photo
 * pool does not reach. That is what keeps the card from ever rendering empty or
 * collapsing in height.
 */
export default function CollegeCover({
  id,
  slug,
  name,
  shortName,
  brandHue = 20,
  variant = 'card',
  className = '',
}) {
  const palette = coverPalette(brandHue);
  const layout = coverLayout(slug, { columns: variant === 'hero' ? 9 : 6 });
  const uid = hashString(slug).toString(36);
  const photo = coverPhoto(id);

  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(photo) && !photoFailed;

  const W = 600;
  const H = 400;
  const baseY = H;
  const horizonY = H * layout.horizon;
  const slot = W / layout.arches.length;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: palette.sky }}
    >
      {/* Layer 1 — generated artwork. Always rendered. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        role="presentation"
        aria-hidden="true"
      >
        <rect width={W} height={H} fill={palette.sky} />
        <rect y={horizonY} width={W} height={H - horizonY} fill={palette.skyDeep} />

        <circle
          cx={layout.sun.x * W}
          cy={layout.sun.y * H}
          r={layout.sun.r * W}
          fill={palette.accent}
          opacity="0.85"
        />

        <g transform={`rotate(${layout.rotation} ${W / 2} ${H})`}>
          {layout.arches.map((arch, index) => {
            const width = slot * arch.width;
            const height = arch.height * (H - horizonY) * 1.5;
            const x = index * slot + (slot - width) / 2 + arch.offset * slot;
            const y = baseY - height;
            const radius = width / 2;
            const path = `M ${x} ${baseY} V ${y + radius} A ${radius} ${radius} 0 0 1 ${
              x + width
            } ${y + radius} V ${baseY} Z`;

            return (
              <g key={index}>
                <path
                  d={path}
                  fill={arch.accent ? palette.accent : palette.mid}
                  opacity={arch.accent ? 0.9 : 0.72}
                />
                <path d={path} fill="none" stroke={palette.ink} strokeWidth="1" opacity="0.35" />
                {arch.rule && (
                  <line
                    x1={x}
                    y1={y + radius}
                    x2={x + width}
                    y2={y + radius}
                    stroke={palette.ink}
                    strokeWidth="1"
                    opacity="0.3"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* The foreground band keeps the monogram legible wherever it lands. */}
        <rect y={H - 96} width={W} height="96" fill={palette.deep} opacity="0.86" />
        <rect y={H - 96} width={W} height="1" fill={palette.accent} opacity="0.7" />
      </svg>

      {/* Layer 2 — the photograph, washed back into the college's hue. */}
      {showPhoto && (
        <>
          <img
            src={photo.src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: photo.objectPosition,
              filter: 'saturate(0.72) contrast(1.05)',
            }}
          />
          {/* Multiply pulls the photo toward the deep end of the hue … */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(165deg, ${palette.deep}, ${palette.mid})`,
              mixBlendMode: 'multiply',
              opacity: 0.42,
            }}
          />
          {/* … and a soft-light pass lifts the highlights back, so it reads as a
              printed duotone rather than a dimmed photo. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundColor: palette.accent, mixBlendMode: 'soft-light', opacity: 0.3 }}
          />
          {/* Scrim behind the monogram. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/5"
            style={{ background: `linear-gradient(to top, ${palette.deep}, transparent)` }}
          />
        </>
      )}

      {/* Layer 3 — grain over everything, so photo and artwork share a texture. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        role="presentation"
        aria-hidden="true"
      >
        <defs>
          <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed={brandHue} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width={W} height={H} filter={`url(#grain-${uid})`} opacity="0.07" />
      </svg>

      <span
        className={`absolute bottom-[6%] left-[5%] font-display tracking-[-0.03em] ${
          variant === 'hero'
            ? 'text-[clamp(2.5rem,7vw,5rem)]'
            : 'text-[clamp(1.75rem,4vw,2.75rem)]'
        }`}
        style={{ color: palette.sky }}
      >
        {monogram(name, shortName)}
      </span>
    </div>
  );
}
