'use client'

import { motion } from 'framer-motion'
import { heroContainerVariants, heroChildVariants } from '@/lib/animation/homepage'

// Title images with their intrinsic dimensions (displayed at half size)
const TITLE_IMAGES: Record<string, { src: string; w: number; h: number }> = {
  tv: { src: '/imgs/title_tv.png', w: 362, h: 134 },
  magazine: { src: '/imgs/text_fun_glossy_mag.svg', w: 1150, h: 264 },
  events: { src: '/imgs/title_events.png', w: 324, h: 100 },
  shop: { src: '/imgs/title_shop.png', w: 195, h: 117 },
  lab: { src: '/imgs/title_lab.png', w: 202, h: 116 },
}

interface SectionIntroProps {
  section: 'tv' | 'magazine' | 'events' | 'shop' | 'lab'
  heading: string
  lines: string[]
}

export default function SectionIntro({ section, heading, lines }: SectionIntroProps) {
  const titleImage = TITLE_IMAGES[section]

  return (
    <section className="relative flex flex-col items-center justify-start px-6 text-center overflow-hidden">
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
          {titleImage ? (
            <img
              src={titleImage.src}
              alt={heading}
              className="mx-auto"
              style={{ width: titleImage.w / 2, height: titleImage.h / 2 }}
            />
          ) : (
            <span className="text-5xl md:text-7xl font-bold font-[family-name:var(--font-display)]">
              {heading}
            </span>
          )}
        </motion.h1>

        {lines.map((line, index) => (
          <motion.p
            key={index}
            variants={heroChildVariants}
            className={`text-body text-white text-center ${index < lines.length - 1 ? 'mb-4' : 'mb-10'}`}
          >
            {line}
          </motion.p>
        ))}
      </motion.div>
    </section>
  )
}
