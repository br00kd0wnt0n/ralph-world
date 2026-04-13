'use client'

import { motion } from 'framer-motion'
import { heroContainerVariants, heroChildVariants } from '@/lib/animation/homepage'
import ScrollIndicator from './ScrollIndicator'

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Gradient background — black to dark teal as page scrolls (CSS handles it) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-[#0F3D5C]/30 pointer-events-none" />

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
          Welcome to our World
        </motion.h1>

        <motion.p variants={heroChildVariants} className="text-secondary text-lg mb-4">
          We make entertainment that brings people together and celebrates the
          things that make life feel good.
        </motion.p>

        <motion.p variants={heroChildVariants} className="text-secondary mb-4">
          From TV and live events to digital content and print, we partner with
          creatives and brands who share our belief that great ideas come from
          taking creative risks, not feeding the algorithm.
        </motion.p>

        <motion.p variants={heroChildVariants} className="text-secondary mb-10">
          If it&apos;s new, different or makes you smile, we&apos;re into it.
        </motion.p>

        <motion.div variants={heroChildVariants}>
          <ScrollIndicator />
        </motion.div>
      </motion.div>
    </section>
  )
}
