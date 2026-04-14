import type { Variants } from 'framer-motion'

// TV screen state transitions — fade + tiny scale
export const screenStateVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}

// Static / noise effect for offline / subscribe gate
export const staticVariants: Variants = {
  flicker: {
    opacity: [1, 0.7, 1, 0.9, 1],
    transition: { duration: 0.3, repeat: Infinity, repeatType: 'reverse' },
  },
}

// Teletext header scrolls in
export const teletextHeaderVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}
