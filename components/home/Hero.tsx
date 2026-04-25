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
  const isDefault = theme.key === 'midnight'
  return (
    <section
      className="relative flex flex-col items-center justify-start px-6 text-center overflow-hidden"
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
          className="mb-8"
        >
          <img
            src="/imgs/text_welcome_to_our_world.png"
            alt={heading}
            className="mx-auto"
            style={{ width: 1126 / 2, height: 252 / 2 }}
          />
        </motion.h1>

        <motion.p variants={heroChildVariants} className="text-body text-white text-center mb-4">
          {line1}
        </motion.p>

        <motion.p variants={heroChildVariants} className="text-body text-white text-center mb-4">
          {line2}
        </motion.p>

        <motion.p variants={heroChildVariants} className="text-body text-white text-center mb-10">
          {line3}
        </motion.p>

        <motion.div variants={heroChildVariants}>
          <ScrollIndicator />
        </motion.div>
      </motion.div>
    </section>
  )
}
