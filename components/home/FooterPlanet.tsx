'use client'

import SpriteAnimation from '@/components/anim/SpriteAnimation'

interface FooterPlanetProps {
  tagline?: string
}

export default function FooterPlanet({ tagline = 'The Entertainment People' }: FooterPlanetProps) {
  return (
    <div
      className="relative flex justify-center overflow-hidden pt-[100px] min-[576px]:pt-[120px] md:pt-[180px] pb-[84px] md:pb-0"
      style={{ marginBottom: -1 }}
    >
      {/* White panel filling the gap below the planet on < 768px so the tagline
          clears the footer globe. Removed at md+ where padding-bottom is 0. */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[84px] bg-white md:hidden pointer-events-none"
        aria-hidden="true"
      />

      <div id="footer-planet" style={{ transform: 'translateY(1px)' }}>
        <img
          src="/imgs/footer_planet.png"
          alt=""
          style={{ width: (2898 / 2) * 0.75, height: (484 / 2) * 0.75 }}
          className="max-w-none"
        />
        {/* Eyed-alien standing on the planet's top, 150px left of centre.
            Part of #footer-planet so it moves with the planet. */}
        <SpriteAnimation
          name="eyed-alien"
          width={90}
          className="absolute z-[1] pointer-events-none select-none"
          style={{ left: '50%', top: 0, transform: 'translate(calc(-50% - 150px), calc(-100% + 65px))' }}
        />
        <div
          className="absolute inset-0 flex flex-col items-center justify-end"
          style={{ paddingBottom: 28 }}
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
