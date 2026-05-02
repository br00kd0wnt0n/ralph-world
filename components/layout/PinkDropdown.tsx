'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PinkDropdownProps {
  width: number
  // How far the dropdown extends past its relative parent's right edge.
  // Set so the notch (always 50px from the dropdown's right edge) points
  // at the desired spot on the trigger button.
  right: number
  children: ReactNode
}

// Spring pop-in with a touch of wobble.
export const panelVariants = {
  hidden: { opacity: 0, scale: 0.7, rotate: -2 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 420, damping: 22 },
  },
}

// Wrap items in a motion.div with this variant to stagger them.
// staggerChildren only affects direct motion children, so this needs to
// sit immediately around the items.
export const stackVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

export const panelItemVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0 },
}

export default function PinkDropdown({ width, right, children }: PinkDropdownProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={panelVariants}
      className="absolute top-full z-50"
      style={{ marginTop: 12, width, right, transformOrigin: 'top right' }}
    >
      {/* Pink notch — sits behind the panel by DOM order, tip pokes above.
          69 = 50px visible from card right edge + 19px wrapper offset */}
      <div
        className="absolute bg-ralph-pink"
        style={{
          width: 12,
          height: 12,
          top: -6,
          right: 69,
          transform: 'rotate(45deg)',
        }}
        aria-hidden="true"
      />
      {/* Pink wrapper provides the solid offset on right + bottom,
          with 45° angled cuts at top-right and bottom-left */}
      <div
        className="bg-ralph-pink"
        style={{
          paddingRight: 19,
          paddingBottom: 19,
          clipPath:
            'polygon(0 0, calc(100% - 19px) 0, 100% 19px, 100% 100%, 19px 100%, 0 calc(100% - 19px))',
        }}
      >
        <div
          className="bg-white"
          style={{
            border: '3px solid #EA128B',
            padding: '16px 16px 16px 1.5rem',
          }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  )
}
