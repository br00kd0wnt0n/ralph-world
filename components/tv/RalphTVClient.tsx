'use client'

import { useState } from 'react'
import TVSet from './TVSet'
import SubscribeModal from '@/components/layout/SubscribeModal'
import Footer from '@/components/layout/Footer'
import { resolveSectionTheme } from '@/lib/section-themes'
import type { SiteCopy } from '@/lib/data/site-copy'

interface RalphTVClientProps {
  heading?: string
  intro?: string
  offlineLabel?: string
  offlineMessage?: string
  subscribeHeading?: string
  subscribeBody?: string
  themeKey?: string
  copy?: Partial<SiteCopy>
}

export default function RalphTVClient({
  heading = 'Ralph TV',
  intro = "Our little TV channel. Switch on, tune in, and see what we're playing right now.",
  offlineLabel,
  offlineMessage,
  subscribeHeading,
  subscribeBody,
  themeKey,
  copy,
}: RalphTVClientProps) {
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const theme = resolveSectionTheme('tv_hero', themeKey)

  return (
    <>
      <section
        className="relative px-2 md:px-6 py-6 md:py-16"
        style={{ backgroundColor: theme.bg, color: theme.text }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4 md:mb-12 px-2">
            <h1 className="text-3xl md:text-6xl font-bold mb-2 md:mb-4 font-[family-name:var(--font-display)]">
              {heading}
            </h1>
            <p className="max-w-xl mx-auto text-sm md:text-base opacity-85">
              {intro}
            </p>
          </div>

          <TVSet
            onSubscribe={() => setSubscribeOpen(true)}
            offlineLabel={offlineLabel}
            offlineMessage={offlineMessage}
            subscribeHeading={subscribeHeading}
            subscribeBody={subscribeBody}
          />
        </div>

        {/* London globe placeholder */}
        <div className="absolute bottom-6 left-6 hidden md:block">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[8px] text-muted">
            globe
          </div>
        </div>
      </section>

      <Footer variant="dark" copy={copy} />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </>
  )
}
