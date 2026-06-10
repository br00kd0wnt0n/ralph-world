'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import LabGrid from './LabGrid'
import SectionIntro from '@/components/layout/SectionIntro'
import SubscribeModal from '@/components/layout/SubscribeModal'
import {
  sectionContainerVariants,
  sectionBgVariants,
  sectionContentVariants,
} from '@/lib/animation/page-transitions'
import type { LabItem } from '@/lib/data/lab'
import type { SiteCopy } from '@/lib/data/site-copy'

interface LabClientProps {
  items: LabItem[]
  copy?: Partial<SiteCopy>
}

export default function LabClient({ items, copy }: LabClientProps) {
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  return (
    <motion.div
      variants={sectionContainerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Intro section - animates itself via heroContainerVariants */}
      <SectionIntro
        section="lab"
        heading={copy?.lab_hero_heading ?? 'Lab'}
        lines={[
          copy?.lab_hero_intro ??
            "Tools, experiments, generators and weird little projects. Everything we've been tinkering with lately.",
          copy?.lab_hero_cta ??
            'What you waiting for — pull the lever to see what comes out.',
        ]}
      />

      {/* Planet + white bg layered with content */}
      <section className="relative">
        {/* Background - animates SECOND after intro establishes height */}
        <motion.div variants={sectionBgVariants} className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full planet-bg-cover"
              style={{
                backgroundImage: 'url(/imgs/planet_background_lab.svg)',
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
                backgroundImage: 'url(/imgs/planet_foreground_lab.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
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

        {/* Content layer - cloud-jar carousel, animates after bg */}
        <motion.div
          variants={sectionContentVariants}
          className="relative z-10 px-6 pb-8"
          style={{ paddingTop: 60 }}
        >
          <div className="max-w-6xl mx-auto">
            <LabGrid items={items} onSubscribe={() => setSubscribeOpen(true)} />
          </div>
        </motion.div>
      </section>

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
