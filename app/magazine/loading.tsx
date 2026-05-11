'use client'

// Static loading skeleton - no animation to avoid conflicts with page transition
export default function Loading() {
  return (
    <div className="min-h-screen">
      {/* Static placeholder for intro - matches SectionIntro layout */}
      <section className="relative flex flex-col items-center justify-start px-6 text-center overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="h-32 mb-8" /> {/* Space for title */}
          <div className="h-6 bg-white/10 rounded w-3/4 mx-auto mb-4" />
          <div className="h-6 bg-white/10 rounded w-2/3 mx-auto mb-10" />
        </div>
      </section>

      {/* Skeleton for content area */}
      <section className="relative">
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-[270px]" />
          <div className="absolute bg-gray-100" style={{ top: 270, left: 0, right: 0, bottom: 0 }} />
        </div>
        <div className="relative z-10 pb-8 min-h-[50vh]" style={{ paddingTop: 200 }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="h-12 w-48 bg-gray-200 rounded mb-6" />
            <div className="aspect-[16/9] bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  )
}
