'use client'

import { useEffect, useState } from 'react'
import SpriteAnimation from '@/components/anim/SpriteAnimation'

interface FooterPlanetProps {
  tagline?: string
}

export default function FooterPlanet({ tagline = 'The Entertainment People' }: FooterPlanetProps) {
  // Breakpoint flags:
  //  < 1200px: the planet-feeder tucks 30px further down the planet's edge.
  //  < 768px : more top padding (200 vs 180).
  //  < 576px : shrink the ralph flag 20% + tighten the tagline bottom padding.
  const [belowXl, setBelowXl] = useState(false)
  const [belowMd, setBelowMd] = useState(false)
  const [belowSm, setBelowSm] = useState(false)
  useEffect(() => {
    const xl = window.matchMedia('(max-width: 1199px)')
    const md = window.matchMedia('(max-width: 767px)')
    const sm = window.matchMedia('(max-width: 575px)')
    const sync = () => {
      setBelowXl(xl.matches)
      setBelowMd(md.matches)
      setBelowSm(sm.matches)
    }
    sync()
    xl.addEventListener('change', sync)
    md.addEventListener('change', sync)
    sm.addEventListener('change', sync)
    return () => {
      xl.removeEventListener('change', sync)
      md.removeEventListener('change', sync)
      sm.removeEventListener('change', sync)
    }
  }, [])

  const flagScale = belowSm ? 0.8 : 1

  return (
    <div
      className="relative flex justify-center overflow-hidden pb-[84px] md:pb-0"
      style={{ marginBottom: -1, paddingTop: belowMd ? 200 : 180 }}
    >
      {/* White panel filling the gap below the planet on < 768px so the tagline
          clears the footer globe. Removed at md+ where padding-bottom is 0. */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[84px] bg-white md:hidden pointer-events-none"
        aria-hidden="true"
      />

      <div id="footer-planet" className="min-[1200px]:w-full min-[1200px]:max-w-[1500px]" style={{ transform: 'translateY(1px)' }}>
        <img
          src="/imgs/footer_planet.png"
          alt=""
          style={{ width: (2898 / 2) * 0.75, height: (484 / 2) * 0.75 }}
          // >=1200: stretch to fill the width (up to the wrapper's 1500px cap)
          // while keeping the fixed inline height — the image distorts wider,
          // it doesn't grow taller. (! overrides the inline width.)
          className="max-w-none min-[1200px]:w-full!"
        />
        {/* Eyed-alien standing on the planet's top, 150px left of centre.
            Part of #footer-planet so it moves with the planet. */}
        <SpriteAnimation
          name="eyed-alien"
          width={90}
          className="absolute z-[1] pointer-events-none select-none light:grayscale hidden md:block"
          style={{ left: '50%', top: 0, transform: 'translate(calc(-50% - 300px), calc(-100% + 45px))' }}
        />
        {/* Ralph flag planted centrally on the planet's top edge. Part of
            #footer-planet so it moves with the planet. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/animations/ralph_flag.png"
          alt=""
          aria-hidden="true"
          className="absolute z-[1] pointer-events-none select-none light:grayscale"
          style={{ left: '50%', top: 0, width: 300 * flagScale, height: 'auto', transform: 'translate(-50%, calc(-100% + 20px))' }}
        />
        {/* Planet-feeder on the right side of the flag, standing on the planet
            top. Part of #footer-planet so it moves with the planet. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/animations/planet-feeder.png"
          alt=""
          aria-hidden="true"
          className="absolute z-[1] pointer-events-none select-none light:grayscale hidden md:block"
          style={{ left: '50%', top: 0, width: 140, height: 'auto', transform: `translate(calc(-50% + 350px), calc(-100% + ${belowXl ? 115 : 85}px))` }}
        />
        <div
          className="absolute inset-0 flex flex-col items-center justify-end"
          style={{ paddingBottom: belowSm ? 18 : 28 }}
        >
          <img
            src="/ralph-wordmark.png"
            alt="ralph"
            style={{ height: 60, width: 'auto', filter: 'brightness(0)' }}
            className="mb-3"
          />
          <img
            src="/imgs/text_the_entertainment_people.png"
            alt={tagline}
            className="w-[340px] min-[576px]:w-[420px] md:w-[340px] h-auto"
          />
        </div>
      </div>
    </div>
  )
}
