'use client'

import Link from 'next/link'

export default function MagazineHero() {
  return (
    <section className="relative px-6 pt-12 pb-16 overflow-hidden">
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
            Got coin?<br />Get mag
          </Link>
        </div>

        {/* Center content */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6 font-[family-name:var(--font-display)]">
            OUR FUN, GLOSSY MAG
          </h1>

          <p className="text-secondary text-sm md:text-base mb-2">
            Get your actual hands on a physically printed, wonderful smelling, quarterly magazine.
          </p>
          <p className="text-secondary text-sm md:text-base mb-4">
            Editor Josh Jones curates joyously interesting content, brought by a host of fantastic writers, photographers,
            artists, foodies, comedians and many more marvellous people &amp; stories from around the world.
          </p>
          <p className="text-muted text-sm font-medium">
            Ralph Mag: Pop Culture For The Fun Of It
          </p>
        </div>
      </div>
    </section>
  )
}
