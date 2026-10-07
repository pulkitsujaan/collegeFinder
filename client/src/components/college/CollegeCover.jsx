import { coverLayout, coverPalette, hashString, monogram } from '../../lib/cover.js';

/**
 * A college's cover, generated from its `brand_hue` and slug. Layered arches,
 * a horizon, a low sun, hairline rules and a grain wash — the same three
 * ingredients every time, arranged differently, so a listing page reads as one
 * family of images rather than a wall of stock photos.
 */
export default function CollegeCover({
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

  const W = 600;
  const H = 400;
  const baseY = H;
  const horizonY = H * layout.horizon;
  const slot = W / layout.arches.length;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: palette.sky }}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="presentation"
      >
        <defs>
          <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed={brandHue} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

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
                <path d={path} fill={arch.accent ? palette.accent : palette.mid} opacity={arch.accent ? 0.9 : 0.72} />
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

        <rect width={W} height={H} filter={`url(#grain-${uid})`} opacity="0.07" />
      </svg>

      <span
        className={`absolute bottom-[6%] left-[5%] font-display tracking-[-0.03em] ${
          variant === 'hero' ? 'text-[clamp(2.5rem,7vw,5rem)]' : 'text-[clamp(1.75rem,4vw,2.75rem)]'
        }`}
        style={{ color: palette.sky }}
      >
        {monogram(name, shortName)}
      </span>
    </div>
  );
}
