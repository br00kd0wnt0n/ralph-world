'use client'

import SectionIntro from '@/components/layout/SectionIntro'

export default function Loading() {
  return (
    <div className="min-h-screen">
      <SectionIntro
        section="shop"
        heading="Buy Ralph Stuff"
        lines={['Magazines, merch, and random things we think are brilliant.']}
      />
      {/* Skeleton for category tabs */}
      <div className="bg-[#E5E5E5] border-b border-gray-300">
        <div className="flex justify-center gap-8 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-20 bg-gray-300 rounded animate-pulse" />
          ))}
        </div>
      </div>
      {/* Skeleton grid */}
      <section className="bg-[#E5E5E5] py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 max-w-6xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-gray-300 rounded animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  )
}
