'use client'

import { useEffect, useRef, useState } from 'react'
import BulletStar from './BulletStar'

// Inline the planet SVG (rather than an <img>) so CSS can recolour its white
// body to off-black in light mode while leaving the black/pink details intact.
// Fetched once, cached at module scope.
const svgCache = new Map<string, Promise<string>>()
function loadSvg(url: string): Promise<string> {
  let p = svgCache.get(url)
  if (!p) {
    p = fetch(url, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
    svgCache.set(url, p)
  }
  return p
}

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
  const planetRef = useRef<HTMLDivElement>(null)
  const [planetSvg, setPlanetSvg] = useState('')

  useEffect(() => {
    let cancelled = false
    loadSvg('/imgs/expertise_planet.svg').then((m) => {
      if (!cancelled) setPlanetSvg(m)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (planetRef.current) planetRef.current.innerHTML = planetSvg
  }, [planetSvg])

  // < 576: shift the top character 100px further left.
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 575px)')
    const sync = () => setNarrow(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  return (
    <div className="relative flex items-center justify-center">
      {/* Planet background - absolutely positioned, height = content + 200px */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          height: 'calc(100% + 200px)',
          width: 'auto',
          aspectRatio: '1 / 1',
          // Nudge left: the SVG planet blob sits slightly right of its viewBox
          // centre, so offset it back to sit behind the content.
          marginLeft: -100,
        }}
      >
        <div
          ref={planetRef}
          className="expertise-planet w-full h-full"
          aria-hidden="true"
        />
      </div>

      {/* Banner boy perched on the planet's top, centred above the content.
          Monochrome in light mode. Half the PNG's native size (536×562). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/animations/banner_boy.png"
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-0 pointer-events-none select-none z-[5] light:grayscale"
        style={{ width: 268, height: 'auto', transform: `translate(calc(-50% + ${narrow ? 50 : 150}px), calc(-100% + ${narrow ? 0 : 20}px))` }}
      />

      {/* Cat-o-tronic perched at the planet's bottom, centred. Above the planet
          (z-[5]). Monochrome in light. Half the native size (393×522). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/animations/cat-o-tronic.png"
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 bottom-0 hidden min-[992px]:block pointer-events-none select-none z-[5] light:grayscale"
        style={{ width: 294, height: 'auto', transform: 'translate(calc(-50% + 100px), 100%)' }}
      />

      {/* Content */}
      <div className="relative z-20 w-full max-w-[380px] min-[576px]:-ml-[30px] text-black light:text-white py-8">
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
                <BulletStar
                  src={src}
                  className={`absolute pointer-events-none w-5 min-[576px]:w-16 ${
                    isLeft
                      ? '-left-6 min-[576px]:-left-[76px]'
                      : '-right-6 min-[576px]:-right-[76px]'
                  }`}
                  style={{
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
                  className="text-black light:text-white font-body mt-0.5"
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
