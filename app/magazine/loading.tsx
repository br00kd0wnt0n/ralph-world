'use client'

import SectionIntro from '@/components/layout/SectionIntro'

export default function Loading() {
  return (
    <div className="min-h-screen">
      <SectionIntro
        section="magazine"
        heading="Magazine"
        lines={[
          'Get your actual hands on a physically printed, wonderful smelling, quarterly magazine.',
        ]}
      />
      {/* Skeleton for cover story */}
      <section className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="aspect-[3/4] md:aspect-[16/9] bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </section>
    </div>
  )
}
