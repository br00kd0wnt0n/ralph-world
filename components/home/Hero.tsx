'use client'

import { motion } from 'framer-motion'
import { heroContainerVariants, heroChildVariants } from '@/lib/animation/homepage'
import { resolveSectionTheme } from '@/lib/section-themes'
import ScrollIndicator from './ScrollIndicator'

interface HeroProps {
  heading: string
  line1: string
  line2: string
  line3: string
  themeKey?: string
}

export default function Hero({ heading, line1, line2, line3, themeKey }: HeroProps) {
  const theme = resolveSectionTheme('home_hero', themeKey)
  // Homepage hero default is midnight — only set backgroundColor when the
  // editor has explicitly picked a different theme, so the global dark
  // globals.css background (and starfield) keeps showing through.
  const isDefault = theme.key === 'midnight'
  return (
    <section
      className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden"
      style={
        isDefault
          ? { color: theme.text }
          : { backgroundColor: theme.bg, color: theme.text }
      }
    >
      <motion.div
        variants={heroContainerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-2xl"
      >
        <motion.h1
          variants={heroChildVariants}
          className="text-5xl md:text-7xl font-bold mb-8 font-[family-name:var(--font-display)]"
        >
          {heading}
        </motion.h1>

        <motion.p variants={heroChildVariants} className="text-lg mb-4 opacity-85">
          {line1}
        </motion.p>

        <motion.p variants={heroChildVariants} className="mb-4 opacity-85">
          {line2}
        </motion.p>

        <motion.p variants={heroChildVariants} className="mb-10 opacity-85">
          {line3}
        </motion.p>

        <motion.div variants={heroChildVariants}>
          <ScrollIndicator />
        </motion.div>
      </motion.div>
    </section>
  )
}
