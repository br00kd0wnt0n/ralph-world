'use client'

export interface PlayPlanetItem {
  id: string
  title: string | null
  subtitle: string | null
  thumbnailUrl: string | null
  url: string
}

// Layout presets for 4–8 planets. Desktop only — mobile gets a compact grid.
// Positions are percentages within the planets container; sizes are px.
// The "featured" flag drives a larger planet size.
function layoutPlanets(
  count: number
): Array<{ xPct: number; yPct: number; sizePx: number; featured: boolean }> {
  const clamped = Math.max(4, Math.min(8, count))
  const out: Array<{ xPct: number; yPct: number; sizePx: number; featured: boolean }> = []
  const xMin = 10
  const xMax = 88
  for (let i = 0; i < clamped; i++) {
    const t = clamped > 1 ? i / (clamped - 1) : 0.5
    const xPct = xMin + t * (xMax - xMin)
    const isUpper = i % 2 === 0
    const yPct = isUpper ? 20 : 55
    // Every third planet is featured (larger) for visual rhythm.
    const featured = i % 3 === 0
    const sizePx = featured ? 200 : 150
    out.push({ xPct, yPct, sizePx, featured })
  }
  return out
}

interface PlayPlanetsProps {
  items: PlayPlanetItem[]
}

export default function PlayPlanets({ items }: PlayPlanetsProps) {
  const visible = items.slice(0, 8)
  const positions = layoutPlanets(visible.length)

  if (visible.length === 0) return null

  return (
    <>
      {/* Desktop: floating absolute layout */}
      <div className="hidden md:block relative mx-auto max-w-6xl h-[520px] px-6">
        {visible.map((cs, i) => {
          const pos = positions[i]
          if (!pos) return null
          const url = cs.url
          // Stagger float animation per planet so they don't move in sync.
          const duration = 5 + (i % 3) * 1.2
          const delay = (i * 0.37) % 2

          return (
            <a
              key={cs.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute group"
              style={{
                left: `${pos.xPct}%`,
                top: `${pos.yPct}%`,
                width: `${pos.sizePx}px`,
                height: `${pos.sizePx}px`,
                transform: 'translate(-50%, -50%)',
                animation: `play-float ${duration}s ease-in-out ${delay}s infinite`,
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-ralph-pink shadow-[0_0_30px_rgba(255,32,152,0.35)] transition-transform duration-300 group-hover:scale-105">
                {cs.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cs.thumbnailUrl}
                    alt={cs.title ?? ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-ralph-pink/40 to-ralph-purple/40 flex items-center justify-center text-white/70 text-xs text-center px-4">
                    {cs.title ?? 'Case study'}
                  </div>
                )}
              </div>
              {(cs.title || cs.subtitle) && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  <div className="bg-black/55 rounded-full px-3 py-1">
                    {cs.title && (
                      <p className="text-white font-bold text-sm leading-tight">
                        {cs.title}
                      </p>
                    )}
                    {cs.subtitle && (
                      <p className="text-white/80 text-[10px] leading-tight mt-0.5">
                        {cs.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </a>
          )
        })}

        <style jsx>{`
          @keyframes play-float {
            0%, 100% {
              transform: translate(-50%, -50%) translateY(0);
            }
            50% {
              transform: translate(-50%, -50%) translateY(-12px);
            }
          }
        `}</style>
      </div>

      {/* Mobile: 2-col compact grid */}
      <div className="md:hidden grid grid-cols-2 gap-4 px-4 py-6">
        {visible.map((cs) => {
          const url = cs.url
          return (
            <a
              key={cs.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-full overflow-hidden ring-2 ring-ralph-pink relative group"
            >
              {cs.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cs.thumbnailUrl}
                  alt={cs.title ?? ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-ralph-pink/40 to-ralph-purple/40" />
              )}
              {(cs.title || cs.subtitle) && (
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 text-center">
                  <div className="bg-black/55 rounded-full px-2 py-1">
                    {cs.title && (
                      <p className="text-white font-bold text-xs leading-tight">
                        {cs.title}
                      </p>
                    )}
                    {cs.subtitle && (
                      <p className="text-white/80 text-[9px] leading-tight mt-0.5">
                        {cs.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </a>
          )
        })}
      </div>
    </>
  )
}
