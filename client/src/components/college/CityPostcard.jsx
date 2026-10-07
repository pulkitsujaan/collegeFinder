import { Link } from 'react-router-dom';

import { cityHue, postcardPalette, skyline } from '../../lib/postcard.js';
import { formatNumber } from '../../lib/format.js';

/**
 * A city postcard: generated skyline, colour keyed to the city, college count.
 * The whole card is a link with a hover tilt — no drag here, the strip itself
 * is what scrolls.
 */
export default function CityPostcard({ city }) {
  const hue = cityHue(city.label);
  const palette = postcardPalette(hue);
  const art = skyline(city.label);

  return (
    <Link
      to={`/colleges?city=${encodeURIComponent(city.value)}`}
      className="group relative block w-[16rem] shrink-0 snap-start border border-rule-soft transition-transform duration-300 ease-editorial hover:-translate-y-1 sm:w-[18rem]"
    >
      <div className="relative h-40 overflow-hidden" style={{ backgroundColor: palette.sky }}>
        <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMax slice" className="h-full w-full" role="presentation">
          <rect width="200" height="120" fill={palette.sky} />
          <rect y="60" width="200" height="60" fill={palette.skyLow} />

          <circle cx={art.sun.x} cy={art.sun.y} r={art.sun.r} fill={palette.accent} opacity="0.9" />

          {/* Back row, lighter and a little higher, for depth. */}
          <g fill={palette.back} opacity="0.55">
            {art.buildings.map((building, index) => (
              <rect
                key={`back-${index}`}
                x={building.x + 3}
                y={120 - building.height * 0.72}
                width={building.width}
                height={building.height * 0.72}
              />
            ))}
          </g>

          <g>
            {art.buildings.map((building, index) => {
              const top = 120 - building.height;
              return (
                <g key={`front-${index}`}>
                  <rect
                    x={building.x}
                    y={top}
                    width={building.width}
                    height={building.height}
                    fill={building.accent ? palette.accent : palette.front}
                  />
                  {building.step === 1 && (
                    <rect
                      x={building.x + building.width * 0.2}
                      y={top - 6}
                      width={building.width * 0.6}
                      height="6"
                      fill={building.accent ? palette.accent : palette.front}
                    />
                  )}
                  {building.windows && (
                    <g fill={palette.sky} opacity="0.55">
                      {[0.3, 0.55, 0.8].map((ratio) => (
                        <rect
                          key={ratio}
                          x={building.x + building.width * ratio - 1}
                          y={top + 10}
                          width="2"
                          height={Math.max(0, building.height - 20)}
                        />
                      ))}
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* A single dome keeps the skyline from reading as pure bar chart. */}
          <path
            d={`M ${art.dome.x - art.dome.r} 120
                V ${120 - 24 - art.dome.r}
                A ${art.dome.r} ${art.dome.r} 0 0 1 ${art.dome.x + art.dome.r} ${120 - 24 - art.dome.r}
                V 120 Z`}
            fill={palette.ink}
          />
          <line x1="0" y1="119.5" x2="200" y2="119.5" stroke={palette.ink} strokeWidth="1" />
        </svg>
      </div>

      <div className="bg-paper p-4">
        <h3 className="font-display text-xl tracking-[-0.02em]">{city.label}</h3>
        <p className="mt-1 flex items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-soft">
          <span>
            {formatNumber(city.count)} {city.count === 1 ? 'college' : 'colleges'}
          </span>
          <span className="text-ink-faint transition-colors group-hover:text-vermilion">Explore →</span>
        </p>
      </div>
    </Link>
  );
}
