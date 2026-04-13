'use client'

import Link from 'next/link'

export default function MagazineHero() {
  return (
    <section className="relative bg-black px-6 pt-16 pb-32 overflow-hidden">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
        {/* Left: character placeholder */}
        <div className="shrink-0 w-32 h-40 bg-ralph-orange/10 rounded-lg flex items-center justify-center text-[10px] text-muted">
          reading char
        </div>

        {/* Center: heading + copy */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4 font-[family-name:var(--font-display)]">
            OUR FUN, GLOSSY MAG
          </h1>
          <p className="text-secondary max-w-lg mb-2">
            Stories, interviews and photo essays about the people and things
            that make pop culture worth caring about.
          </p>
          <p className="text-muted text-sm">
            Edited by the Ralph team
          </p>
        </div>

        {/* Right: starburst badge */}
        <Link
          href="/shop"
          className="shrink-0 w-28 h-28 rounded-full bg-ralph-orange flex items-center justify-center text-center text-white text-xs font-bold leading-tight p-3 hover:scale-105 transition-transform"
        >
          Got coin?<br />Get mag
        </Link>
      </div>

      {/* Pink arch transition */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full block">
          <path
            d="M0,120 Q720,0 1440,120"
            fill="none"
            stroke="#FF2098"
            strokeWidth="2"
          />
          <path d="M0,120 Q720,20 1440,120 L1440,120 L0,120 Z" fill="#FAFAFA" />
        </svg>
      </div>
    </section>
  )
}
