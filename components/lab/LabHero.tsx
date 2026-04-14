'use client'

export default function LabHero() {
  return (
    <section className="px-6 py-12 md:py-20 text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold text-ralph-yellow mb-6 font-[family-name:var(--font-display)]">
          LAB
        </h1>
        <p className="text-secondary text-base md:text-lg mb-4 max-w-xl mx-auto">
          Tools, experiments, generators and weird little projects. Everything
          we&apos;ve been tinkering with lately.
        </p>
        <p className="text-ralph-yellow text-sm md:text-base font-medium">
          What you waiting for — pull the lever to see what comes out.
        </p>
      </div>
    </section>
  )
}
