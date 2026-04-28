'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionIntro from '@/components/layout/SectionIntro'
import TVSet from './TVSet'
import SubscribeModal from '@/components/layout/SubscribeModal'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import type { SiteCopy } from '@/lib/data/site-copy'

interface RalphTVClientProps {
  heading?: string
  intro?: string
  offlineLabel?: string
  offlineMessage?: string
  subscribeHeading?: string
  subscribeBody?: string
  copy?: Partial<SiteCopy>
}

export default function RalphTVClient({
  heading = 'Ralph TV',
  intro = "Our little TV channel. Switch on, tune in, and see what we're playing right now.",
  offlineLabel,
  offlineMessage,
  subscribeHeading,
  subscribeBody,
  copy,
}: RalphTVClientProps) {
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Intro section with transparent bg */}
      <SectionIntro
        section="tv"
        heading={heading}
        lines={[intro]}
      />

      {/* TV Set section */}
      <section className="relative px-2 md:px-6 pb-6 md:pb-16">
        <div className="max-w-6xl mx-auto">
          <TVSet
            onSubscribe={() => setSubscribeOpen(true)}
            offlineLabel={offlineLabel}
            offlineMessage={offlineMessage}
            subscribeHeading={subscribeHeading}
            subscribeBody={subscribeBody}
          />
        </div>
      </section>

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
