'use client'

import { useState } from 'react'
import TVSet from './TVSet'
import SubscribeModal from '@/components/layout/SubscribeModal'
import Footer from '@/components/layout/Footer'

export default function RalphTVClient() {
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  return (
    <>
      <section className="relative px-4 md:px-6 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4 font-[family-name:var(--font-display)]">
              Ralph TV
            </h1>
            <p className="text-secondary max-w-xl mx-auto">
              Our little TV channel. Switch on, tune in, and see what we&apos;re
              playing right now.
            </p>
          </div>

          <TVSet onSubscribe={() => setSubscribeOpen(true)} />
        </div>

        {/* London globe placeholder */}
        <div className="absolute bottom-6 left-6 hidden md:block">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[8px] text-muted">
            globe
          </div>
        </div>
      </section>

      <Footer variant="dark" />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </>
  )
}
