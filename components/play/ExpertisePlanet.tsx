'use client'

interface ExpertiseBullet {
  heading: string
  body: string
}

interface ExpertisePlanetProps {
  intro: string
  bullets: ExpertiseBullet[]
}

function Spark({ className = '' }: { className?: string }) {
  // Hand-drawn pink asterisk/spark accent used next to each expertise bullet.
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <g stroke="#FF2098" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="5" y1="5" x2="19" y2="19" />
        <line x1="19" y1="5" x2="5" y2="19" />
      </g>
    </svg>
  )
}

export default function ExpertisePlanet({ intro, bullets }: ExpertisePlanetProps) {
  return (
    <div className="relative w-full md:w-[620px] aspect-square rounded-full bg-white shadow-[0_0_40px_rgba(0,0,0,0.25)] flex items-center justify-center p-12 md:p-20">
      <div className="max-w-[78%] text-black">
        <p className="text-sm md:text-base leading-relaxed mb-5">{intro}</p>
        <ul className="space-y-4">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3">
              <Spark className="w-5 h-5 mt-0.5" />
              <div>
                <p className="text-ralph-pink font-bold text-sm md:text-base leading-tight">
                  {b.heading}
                </p>
                <p className="text-black text-xs md:text-sm leading-relaxed mt-0.5">
                  {b.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
