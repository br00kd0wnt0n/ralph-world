'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import LabGrid from './LabGrid'
import LabOverlay from './LabOverlay'
import SpriteAnimation from '@/components/anim/SpriteAnimation'
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
  const [openItem, setOpenItem] = useState<LabItem | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  // < 1200px: drop the planet saucer 15px further down.
  const [belowXl, setBelowXl] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1199px)')
    const sync = () => setBelowXl(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  function handleItemClick(item: LabItem) {
    setOpenItem(item)
    setOverlayOpen(true)
  }
  function closeOverlay() {
    setOverlayOpen(false)
    // Keep `openItem` populated through the exit animation so the modal
    // still has content to render while fading out; clear once unmounted.
    setTimeout(() => setOpenItem(null), 250)
  }

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
            'Have a poke around — every tile below is a real experiment.',
        ]}
      />

      {/* Planet + white bg layered with content */}
      <section className="relative">
        {/* Background - animates SECOND after intro establishes height */}
        <motion.div variants={sectionBgVariants} className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full planet-bg-cover light:brightness-[0.1373]"
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
            className="absolute bg-white light:bg-[#232323]"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </motion.div>

        {/* Constantly-animating saucer perched on the planet's top edge, right
            of centre. Fades in with the planet. */}
        <motion.div
          variants={sectionBgVariants}
          className="absolute z-[5] left-1/2 top-0 hidden min-[992px]:block pointer-events-none select-none"
          aria-hidden="true"
        >
          <Link
            href="/space-invaders"
            aria-label="Play Space Invaders"
            className="inline-block leading-none pointer-events-auto cursor-pointer light:grayscale"
            style={{ transform: `translate(calc(-50% + 350px), calc(-70% + ${belowXl ? 25 : 10}px)) rotate(8deg)` }}
          >
            <SpriteAnimation name="saucer" mode="loop" width={140} className="pointer-events-none" />
          </Link>
        </motion.div>

        {/* Content layer - cloud-jar carousel, animates after bg */}
        <motion.div
          variants={sectionContentVariants}
          className="relative z-10 px-0 min-[768px]:px-6 pb-8"
          style={{ paddingTop: 60 }}
        >
          <div className="max-w-6xl mx-auto">
            <LabGrid items={items} onItemClick={handleItemClick} />
          </div>
        </motion.div>
      </section>

      <LabOverlay
        item={openItem}
        isOpen={overlayOpen}
        onClose={closeOverlay}
        onSubscribe={() => {
          closeOverlay()
          setSubscribeOpen(true)
        }}
      />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
