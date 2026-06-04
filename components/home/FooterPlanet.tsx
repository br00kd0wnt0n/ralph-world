'use client'

interface FooterPlanetProps {
  tagline?: string
}

export default function FooterPlanet({ tagline = 'The Entertainment People' }: FooterPlanetProps) {
  return (
    <div
      className="relative flex justify-center overflow-hidden pt-[100px] min-[576px]:pt-[120px] md:pt-[180px] pb-[24px] min-[576px]:pb-0"
      style={{ marginBottom: -1 }}
    >
      {/* White panel filling the 24px gap below the planet on < 576px.
          Removed on larger viewports where padding-bottom is 0. */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[24px] bg-white min-[576px]:hidden pointer-events-none"
        aria-hidden="true"
      />

      <div style={{ transform: 'translateY(1px)' }}>
        <img
          src="/imgs/footer_planet.png"
          alt=""
          style={{ width: (2898 / 2) * 0.75, height: (484 / 2) * 0.75 }}
          className="max-w-none"
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
