import type { Variants } from 'framer-motion'

// Parallax multiplier — scene moves opposite to mouse
export const CROWD_PARALLAX_FACTOR = -0.3

// Wristband gentle bob
export const creatureVariants: Variants = {
  idle: {
    y: [0, -4, 0],
    transition: {
      duration: 2.5,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
  selected: {
    scale: 1.05,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

// Flyout stage transitions
export const flyoutVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 10,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}

// Past events grid fade in
export const pastEventVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}
