'use client'

import { resolveSectionTheme } from '@/lib/section-themes'

interface EventsHeroProps {
  heading?: string
  subtitle?: string
  helper?: string
  themeKey?: string
}

export default function EventsHero({
  heading = "LET'S MEET UP",
  subtitle = 'For real. IRL.',
  helper = 'Check below for the latest events.',
  themeKey,
}: EventsHeroProps) {
  const theme = resolveSectionTheme('events_hero', themeKey)
  return (
    <section
      className="relative px-6 py-12 md:py-20 text-center overflow-hidden"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Decorative placeholders */}
      <div className="absolute left-8 top-16 hidden md:block">
        <div className="w-16 h-16 rounded-full bg-ralph-pink/10 flex items-center justify-center text-[8px] text-muted">
          planet
        </div>
      </div>
      <div className="absolute right-8 top-8 hidden md:block">
        <div className="w-12 h-8 bg-ralph-teal/10 rounded-full flex items-center justify-center text-[8px] text-muted">
          satellite
        </div>
      </div>
      <div className="absolute left-12 bottom-4 hidden md:block">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[7px] text-muted">
          globe
        </div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 font-[family-name:var(--font-display)]">
          {heading}
        </h1>
        <p className="text-lg md:text-xl mb-1 opacity-85">{subtitle}</p>
        <p className="text-sm md:text-base opacity-70">{helper}</p>
      </div>
    </section>
  )
}
