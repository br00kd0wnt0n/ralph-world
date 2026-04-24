'use client'

import Link from 'next/link'
import { resolveSectionTheme } from '@/lib/section-themes'

interface MagazineHeroProps {
  heading?: string
  intro1?: string
  intro2?: string
  shopCta?: string
  themeKey?: string
}

export default function MagazineHero({
  heading = 'OUR FUN, GLOSSY MAG',
  intro1 = 'Get your actual hands on a physically printed, wonderful smelling, quarterly magazine.',
  intro2 = 'Editor Josh Jones curates joyously interesting content, brought by a host of fantastic writers, photographers, artists, foodies, comedians and many more marvellous people & stories from around the world.',
  shopCta = 'Got coin? Get mag',
  themeKey,
}: MagazineHeroProps) {
  const theme = resolveSectionTheme('magazine_hero', themeKey)
  return (
    <section
      className="relative px-6 pt-12 pb-16 overflow-hidden"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div className="max-w-5xl mx-auto relative">
        {/* Left: character placeholder */}
        <div className="absolute left-0 bottom-0 hidden md:block">
          <div className="w-28 h-36 bg-ralph-pink/10 rounded-lg flex items-center justify-center text-[10px] text-muted">
            reading char
          </div>
        </div>

        {/* Right: starburst badge */}
        <div className="absolute right-0 top-8 hidden md:block">
          <Link
            href="/shop"
            className="w-24 h-24 rounded-full bg-black border-2 border-primary flex items-center justify-center text-center text-white text-[10px] font-bold leading-tight p-2 hover:scale-105 transition-transform rotate-12"
          >
            {shopCta}
          </Link>
        </div>

        {/* Center content */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 font-[family-name:var(--font-display)]">
            {heading}
          </h1>

          <p className="text-sm md:text-base mb-2 opacity-85">{intro1}</p>
          <p className="text-sm md:text-base mb-4 opacity-85">{intro2}</p>
          <p className="text-sm font-medium opacity-70">
            Ralph Mag: Pop Culture For The Fun Of It
          </p>
        </div>
      </div>
    </section>
  )
}
