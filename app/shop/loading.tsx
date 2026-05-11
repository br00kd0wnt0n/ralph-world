'use client'

// Static loading skeleton - no animation to avoid conflicts with page transition
export default function Loading() {
  return (
    <div className="min-h-screen">
      {/* Static placeholder for intro */}
      <section className="relative flex flex-col items-center justify-start px-6 text-center overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="h-24 mb-8" /> {/* Space for title */}
          <div className="h-6 bg-white/10 rounded w-3/4 mx-auto mb-10" />
        </div>
      </section>

      {/* Skeleton for content area */}
      <section className="relative">
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-[270px]" />
          <div className="absolute bg-gray-100" style={{ top: 270, left: 0, right: 0, bottom: 0 }} />
        </div>
        <div className="relative z-10 pb-8 min-h-[50vh]" style={{ paddingTop: 200 }}>
          {/* Category tabs skeleton */}
          <div className="w-full mx-auto px-6" style={{ maxWidth: 502 }}>
            <div className="flex justify-center gap-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
          {/* Product grid skeleton */}
          <div className="px-6 py-8">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
