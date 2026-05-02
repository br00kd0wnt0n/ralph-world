'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
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
  offlineLabel,
  offlineMessage,
  subscribeHeading,
  subscribeBody,
}: RalphTVClientProps) {
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Planet + white bg layered with content */}
      <section className="relative">
        <div className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
              style={{
                backgroundImage: 'url(/imgs/planet_background_tv.svg)',
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
                backgroundImage: 'url(/imgs/planet_foreground_tv.svg)',
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
        </div>

        {/* Content layer */}
        <div
          className="relative z-10 px-2 md:px-6 pb-6 md:pb-16"
          style={{ paddingTop: 200 }}
        >
          <div className="max-w-6xl mx-auto">
            <TVSet
              onSubscribe={() => setSubscribeOpen(true)}
              offlineLabel={offlineLabel}
              offlineMessage={offlineMessage}
              subscribeHeading={subscribeHeading}
              subscribeBody={subscribeBody}
            />
          </div>
        </div>
      </section>

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
