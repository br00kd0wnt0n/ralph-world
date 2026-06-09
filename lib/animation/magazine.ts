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
// Slides up from below + fades in so it's clear the article is opening
// as an overlay rather than as a route change. Bezier values mirror the
// project's standard easeOut / easeIn used by the page transitions.
export const overlayVariants: Variants = {
  hidden: { opacity: 0, y: 80 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 80,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
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
