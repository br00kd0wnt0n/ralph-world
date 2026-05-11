'use client'

// Static loading skeleton - no animation to avoid conflicts with page transition
export default function Loading() {
  return (
    <div className="min-h-screen">
      {/* Skeleton for content area */}
      <section className="relative">
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-[270px]" />
          <div className="absolute bg-gray-100" style={{ top: 270, left: 0, right: 0, bottom: 0 }} />
        </div>
        <div className="relative z-10 px-6 pb-8 min-h-[50vh]" style={{ paddingTop: 200 }}>
          <div className="max-w-6xl mx-auto">
            <div className="aspect-square max-w-md mx-auto bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  )
}
