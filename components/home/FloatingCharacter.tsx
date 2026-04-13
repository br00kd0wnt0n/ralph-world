'use client'

import { motion } from 'framer-motion'
import { floatingCharVariants } from '@/lib/animation/homepage'

interface FloatingCharacterProps {
  index: number
  className?: string
  illustration?: React.ComponentType
}

export default function FloatingCharacter({
  index,
  className = '',
  illustration: Illustration,
}: FloatingCharacterProps) {
  return (
    <motion.div
      variants={floatingCharVariants}
      animate="float"
      className={`pointer-events-none ${className}`}
      style={{ animationDelay: `${index * 0.5}s` }}
    >
      {Illustration ? (
        <Illustration />
      ) : (
        <div className="w-16 h-16 md:w-20 md:h-20 bg-ralph-pink/10 rounded-full flex items-center justify-center text-[8px] text-muted">
          char-{index}
        </div>
      )}
    </motion.div>
  )
}
