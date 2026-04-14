'use client'

import { motion } from 'framer-motion'
import { heroContainerVariants, heroChildVariants } from '@/lib/animation/homepage'
import ScrollIndicator from './ScrollIndicator'

interface HeroProps {
  heading: string
  line1: string
  line2: string
  line3: string
}

export default function Hero({ heading, line1, line2, line3 }: HeroProps) {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Subtle background tint — no hard edge when scrolling out */}
      <div className="absolute inset-0 bg-black pointer-events-none" />

      <motion.div
        variants={heroContainerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-2xl"
      >
        <motion.h1
          variants={heroChildVariants}
          className="text-5xl md:text-7xl font-bold text-primary mb-8 font-[family-name:var(--font-display)]"
        >
          {heading}
        </motion.h1>

        <motion.p variants={heroChildVariants} className="text-secondary text-lg mb-4">
          {line1}
        </motion.p>

        <motion.p variants={heroChildVariants} className="text-secondary mb-4">
          {line2}
        </motion.p>

        <motion.p variants={heroChildVariants} className="text-secondary mb-10">
          {line3}
        </motion.p>

        <motion.div variants={heroChildVariants}>
          <ScrollIndicator />
        </motion.div>
      </motion.div>
    </section>
  )
}
