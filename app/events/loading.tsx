'use client'

import SectionIntro from '@/components/layout/SectionIntro'

export default function Loading() {
  return (
    <div className="min-h-screen">
      <SectionIntro
        section="events"
        heading="Let's Meet Up"
        lines={['For real. IRL.', 'Check below for the latest events.']}
      />
      {/* Skeleton for events grid */}
      <section className="px-6 py-8">
        <div className="max-w-4xl mx-auto grid gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  )
}
