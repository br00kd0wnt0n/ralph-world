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

// Font + weight + letter-spacing are consistent across breakpoints; size
// and line-height come from Tailwind classes so they can flip at 576px.
const introStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body), Arial, sans-serif',
  fontWeight: 600,
  letterSpacing: 0,
}

const introClasses =
  'text-white text-center text-[15px] leading-[19px] min-[576px]:text-[16px] min-[576px]:leading-[24px]'

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
            className="mx-auto max-w-full h-auto md:h-[126px]"
            style={{ width: 1126 / 2 }}
          />
        </motion.h1>

        <motion.p
          variants={heroChildVariants}
          className={`${introClasses} mb-4`}
          style={introStyle}
        >
          {line1}
        </motion.p>

        <motion.p
          variants={heroChildVariants}
          className={`${introClasses} mb-4`}
          style={introStyle}
        >
          {line2}
        </motion.p>

        <motion.p
          variants={heroChildVariants}
          className={`${introClasses} mb-10`}
          style={introStyle}
        >
          {line3}
        </motion.p>

        <motion.div variants={heroChildVariants}>
          <ScrollIndicator />
        </motion.div>
      </motion.div>
    </section>
  )
}
