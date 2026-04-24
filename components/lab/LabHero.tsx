'use client'

import { resolveSectionTheme } from '@/lib/section-themes'

interface LabHeroProps {
  heading?: string
  intro?: string
  cta?: string
  themeKey?: string
}

export default function LabHero({
  heading = 'LAB',
  intro = "Tools, experiments, generators and weird little projects. Everything we've been tinkering with lately.",
  cta = 'What you waiting for — pull the lever to see what comes out.',
  themeKey,
}: LabHeroProps) {
  const theme = resolveSectionTheme('lab_hero', themeKey)
  return (
    <section
      className="px-6 py-12 md:py-20 text-center"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 font-[family-name:var(--font-display)]">
          {heading}
        </h1>
        <p className="text-base md:text-lg mb-4 max-w-xl mx-auto opacity-85">
          {intro}
        </p>
        <p className="text-sm md:text-base font-medium opacity-90">{cta}</p>
      </div>
    </section>
  )
}
