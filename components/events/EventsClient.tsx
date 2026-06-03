'use client'

import { motion } from 'framer-motion'
import SectionIntro from '@/components/layout/SectionIntro'
import MinglingCharacters from './MinglingCharacters'
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
}

export default function EventsClient({ activeEvents = [], copy }: EventsClientProps) {
  return (
    <motion.div
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

      {/* Planet + white bg layered with content.
          flex flex-col + min-height keeps the section as tall as the
          remaining viewport on big screens. The content layer below uses
          mt-auto so the characters/hands block anchors to the bottom of
          the section (just above the footer) instead of leaving a gap. */}
      <section
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100svh - 200px)' }}
      >
        {/* Background - animates SECOND */}
        <motion.div variants={sectionBgVariants} className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
              style={{
                backgroundImage: 'url(/imgs/planet_background_events.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_events.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          <div
            className="absolute bg-white"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </motion.div>

        {/* Content layer - animates LAST. mt-auto pushes the characters
            block to the bottom of the section so on tall viewports it
            sits flush with the footer (white bg fills the gap above). */}
        <motion.div
          variants={sectionContentVariants}
          className="relative z-10 w-full mt-auto"
          style={{ paddingTop: 0 }}
        >
          <MinglingCharacters events={activeEvents} />
        </motion.div>
      </section>
    </motion.div>
  )
}
