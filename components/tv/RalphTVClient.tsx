'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import TVSet from './TVSet'
import SubscribeModal from '@/components/layout/SubscribeModal'
import {
  sectionContainerVariants,
  sectionBgNoIntroVariants,
  sectionContentNoIntroVariants,
} from '@/lib/animation/page-transitions'
import type { SiteCopy } from '@/lib/data/site-copy'

interface RalphTVClientProps {
  heading?: string
  intro?: string
  offlineLabel?: string
  offlineMessage?: string
  subscribeHeading?: string
  subscribeBody?: string
  /** Whether the freeview timer is active. false = unrestricted playback for everyone. */
  previewEnabled?: boolean
  /** Seconds a guest may watch before the gate appears. 0 = gate immediately. */
  previewSeconds?: number
  copy?: Partial<SiteCopy>
}

export default function RalphTVClient({
  offlineLabel,
  offlineMessage,
  subscribeHeading,
  subscribeBody,
  previewEnabled,
  previewSeconds,
}: RalphTVClientProps) {
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  return (
    <motion.div
      variants={sectionContainerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Planet + white bg layered with content.
          min-height ensures the white background extends to the footer on
          tall viewports (and on mobile, where the TV set is short
          relative to the screen). 200px is approximate footer height —
          tweak as needed. */}
      <section
        className="relative min-h-[calc(100svh_-_350px)] min-[768px]:min-h-[calc(100svh_-_200px)]"
        style={{ marginTop: 32 }}
      >
        {/* Background - animates FIRST */}
        <motion.div variants={sectionBgNoIntroVariants} className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270, marginTop: 12 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full planet-bg-cover"
              style={{
                backgroundImage: 'url(/imgs/planet_background_tv.svg)',
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
                backgroundImage: 'url(/imgs/planet_foreground_tv.svg)',
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
            style={{ top: 282, left: 0, right: 0, bottom: 0 }}
          />
        </motion.div>

        {/* Content layer - animates SECOND */}
        <motion.div
          variants={sectionContentNoIntroVariants}
          className="relative z-10 px-2 md:px-6 pb-6 md:pb-16"
        >
          <div className="max-w-6xl mx-auto">
            <TVSet
              onSubscribe={() => setSubscribeOpen(true)}
              offlineLabel={offlineLabel}
              offlineMessage={offlineMessage}
              subscribeHeading={subscribeHeading}
              subscribeBody={subscribeBody}
              previewEnabled={previewEnabled}
              previewSeconds={previewSeconds}
            />
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
