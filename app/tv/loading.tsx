'use client'

import SectionIntro from '@/components/layout/SectionIntro'

export default function Loading() {
  return (
    <div className="min-h-screen">
      <SectionIntro
        section="tv"
        heading="Ralph TV"
        lines={["Our little TV channel. Switch on, tune in, and see what we're playing right now."]}
      />
      {/* Skeleton for TV set */}
      <section className="relative px-2 md:px-6 pb-6 md:pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="aspect-video bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </section>
    </div>
  )
}
