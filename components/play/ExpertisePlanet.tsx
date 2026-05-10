'use client'

interface ExpertiseBullet {
  heading: string
  body: string
}

interface ExpertisePlanetProps {
  intro: string
  bullets: ExpertiseBullet[]
}

const BULLET_STARS = [
  '/imgs/bullet_star_01.svg',
  '/imgs/bullet_star_02.svg',
  '/imgs/bullet_star_03.svg',
]

// Generate random star and rotation for each bullet (seeded by index for consistency)
function getBulletStar(index: number) {
  const starIndex = (index * 7 + 3) % BULLET_STARS.length
  const rotation = ((index * 47 + 13) % 360)
  return { src: BULLET_STARS[starIndex], rotation }
}

export default function ExpertisePlanet({ intro, bullets }: ExpertisePlanetProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Planet background - absolutely positioned, height = content + 200px */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          height: 'calc(100% + 200px)',
          width: 'auto',
          aspectRatio: '1 / 1',
        }}
      >
        <img
          src="/imgs/planet_creative.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 w-[380px] text-black py-8">
        <p
          className="text-left mb-5"
          style={{
            fontFamily: "'Gooper Trial', serif",
            fontWeight: 600,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          {intro}
        </p>
        <ul className="space-y-4">
          {bullets.map((b, i) => {
            const { src, rotation } = getBulletStar(i)
            const isLeft = i % 2 === 0
            return (
              <li key={i} className={`relative ${isLeft ? 'text-left' : 'text-right'}`}>
                {/* Bullet star - alternates left/right */}
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  className="absolute pointer-events-none"
                  style={{
                    width: 64,
                    height: 'auto',
                    ...(isLeft ? { left: -76 } : { right: -76 }),
                    top: 0,
                    transform: `rotate(${rotation}deg)`,
                  }}
                />
                <p
                  className="text-ralph-pink"
                  style={{
                    fontFamily: "'Gooper Trial', serif",
                    fontWeight: 600,
                    fontSize: 22,
                    lineHeight: '24px',
                  }}
                >
                  {b.heading}
                </p>
                <p
                  className="text-black font-body mt-0.5"
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    lineHeight: '24px',
                  }}
                >
                  {b.body}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
