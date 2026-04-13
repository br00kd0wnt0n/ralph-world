import type { Variants } from 'framer-motion'

// ── Claw Mechanic ──
export const clawVariants: Variants = {
  idle: { y: -200, opacity: 0 },
  descending: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  retracting: {
    y: -200,
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
}

export const grabbedCardVariants: Variants = {
  resting: { y: 0, rotate: 0, scale: 1 },
  lifted: {
    y: -40,
    rotate: -3,
    scale: 1.02,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

export const clawPreviewVariants: Variants = {
  hidden: { opacity: 0, y: -20, rotate: 0 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 15,
    transition: { duration: 0.35, ease: 'easeOut', delay: 0.15 },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// ── Article Grid ──
export const gridCardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

export const gridContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

// ── Article Overlay ──
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

export const overlayContentVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut', delay: 0.1 },
  },
}
