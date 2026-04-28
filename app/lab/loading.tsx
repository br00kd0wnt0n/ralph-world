'use client'

import SectionIntro from '@/components/layout/SectionIntro'

export default function Loading() {
  return (
    <div className="min-h-screen">
      <SectionIntro
        section="lab"
        heading="Lab"
        lines={[
          "Tools, experiments, generators and weird little projects. Everything we've been tinkering with lately.",
        ]}
      />
      {/* Skeleton for lab content */}
      <section className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="aspect-square max-w-md mx-auto bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </section>
    </div>
  )
}
