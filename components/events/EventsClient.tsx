'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import SectionIntro from '@/components/layout/SectionIntro'
import MinglingCharacters from './MinglingCharacters'
import SubscribeModal from '@/components/layout/SubscribeModal'
import {
  sectionContainerVariants,
  sectionBgVariants,
  sectionContentVariants,
} from '@/lib/animation/page-transitions'
import type { EventRow } from '@/lib/data/events'
import type { SiteCopy } from '@/lib/data/site-copy'

interface EventsClientProps {
  activeEvents?: EventRow[]
  copy?: Partial<SiteCopy>
  /** Set by the /events/[slug] server route — opens that event's panel. */
  initialShowSlug?: string
}

export default function EventsClient({ activeEvents = [], copy, initialShowSlug }: EventsClientProps) {
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // On this page (>= 992):
  //  1. Give the body a full-viewport min-height so its flex-col + `main flex-1`
  //     push the footer to the bottom of the screen.
  //  2. Grow the events section to meet the footer, so its white background
  //     fills the blank space between the content and the footer on tall
  //     displays (the content is only ~500px tall).
  // Scoped to the events route — the cleanup restores the defaults when
  // navigating away or dropping below 992.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 992px)')
    let raf = 0
    const apply = () => {
      raf = 0
      const section = sectionRef.current
      if (!section) return
      if (!mql.matches) {
        document.body.style.minHeight = ''
        section.style.minHeight = ''
        return
      }
      document.body.style.minHeight = '100svh'
      // Measure the section at its natural height, then stretch it down to the
      // footer. The footer is anchored to the bottom of the 100svh body, so its
      // top doesn't move as the section grows — one pass converges.
      const prev = section.style.minHeight
      section.style.minHeight = ''
      const footer = document.querySelector('footer')
      const rect = section.getBoundingClientRect()
      const footerTop = footer
        ? footer.getBoundingClientRect().top
        : rect.bottom
      const gap = footerTop - rect.bottom
      const next = gap > 1 ? `${Math.round(rect.height + gap)}px` : ''
      section.style.minHeight = next === prev ? prev : next
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    schedule()
    const ro = new ResizeObserver(schedule)
    if (rootRef.current) ro.observe(rootRef.current)
    window.addEventListener('resize', schedule)
    mql.addEventListener('change', schedule)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      mql.removeEventListener('change', schedule)
      if (raf) cancelAnimationFrame(raf)
      document.body.style.minHeight = ''
      if (sectionRef.current) sectionRef.current.style.minHeight = ''
    }
  }, [])

  return (
    <motion.div
      ref={rootRef}
      variants={sectionContainerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Intro section - animates itself via heroContainerVariants */}
      <SectionIntro
        section="events"
        heading={copy?.events_hero_heading ?? "Let's Meet Up"}
        lines={[
          copy?.events_hero_subtitle ?? 'For real. IRL.',
          copy?.events_hero_helper ?? 'Check below for the latest events.',
        ]}
      />

      {/* Planet + white bg layered with content. On >= 992 the effect above
          stretches this section down to the footer so the white bg fills any
          blank space on tall displays (see the min-height it sets). */}
      <section
        ref={sectionRef}
        className="relative flex flex-col mb-[80px] min-[992px]:mb-0"
      >
        {/* Background - animates SECOND */}
        <motion.div variants={sectionBgVariants} className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full planet-bg-cover light:brightness-[0.1373]"
              style={{
                backgroundImage: 'url(/imgs/planet_background_events.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none planet-bg-cover"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_events.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          {/* White content bg. Stops at the bottom planet (bottom-[270px]) on
              < 992 so it doesn't show through the flipped planet's transparent
              area — mirrors the clean top:270 cut at the top planet. Fills to
              the bottom on >= 992 where there is no bottom planet. */}
          <div className="absolute bg-white light:bg-[#232323] left-0 right-0 top-[270px] bottom-[270px] min-[992px]:bottom-0" />

          {/* Bottom planet — only < 992, flipped vertically so combined
              with the top planet it reads as a full planet. Sits inside the
              section's bottom (part of the layout) so the content centres
              evenly between the two planets. */}
          <div
            className="absolute left-0 right-0 min-[992px]:hidden overflow-hidden"
            style={{ bottom: 0, height: 270 }}
            aria-hidden="true"
          >
            <div
              className="absolute left-1/2 h-full planet-bg-cover light:brightness-[0.1373]"
              style={{
                backgroundImage: 'url(/imgs/planet_background_events.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100%',
                top: 0,
                transform: 'translateX(-50%) scaleY(-1)',
              }}
            />
            <div
              className="absolute left-1/2 h-full pointer-events-none planet-bg-cover"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_events.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                width: '100%',
                top: 0,
                transform: 'translateX(-50%) scaleY(-1)',
              }}
            />
          </div>
        </motion.div>

        {/* Dinodog perched on the planet's top edge, centred then nudged 200px
            left of middle. Hidden < 768. Fades in with the planet; the offset
            lives on the inner img so framer's reveal transform doesn't clobber
            it. */}
        <motion.div
          variants={sectionBgVariants}
          className="absolute z-[5] left-1/2 -top-[40px] min-[992px]:-top-[60px] hidden md:block pointer-events-none select-none"
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/animations/dinodog.png"
            alt=""
            className="block light:grayscale"
            style={{ width: 120, height: 'auto', transform: 'translateX(calc(-50% - 300px))' }}
          />
        </motion.div>

        {/* Content layer - animates LAST. */}
        <motion.div
          variants={sectionContentVariants}
          className="relative z-10 w-full"
        >
          <MinglingCharacters
            events={activeEvents}
            onSubscribe={() => setSubscribeOpen(true)}
            initialShowSlug={initialShowSlug}
          />
        </motion.div>
      </section>

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
