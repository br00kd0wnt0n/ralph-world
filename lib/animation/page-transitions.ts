import type { Variants } from 'framer-motion'

// ── Section Page Entry Sequence ──
// 1. Intro text fades in (0-0.5s)
// 2. Planet fades in + moves up from y:20 (0.3-0.8s)
// 3. Content fades in (0.5-1.0s)

// Container - orchestrates children
export const sectionContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0,
    },
  },
  exit: {},
}

// Intro/hero text - fades in first
export const sectionIntroVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// Background/planets layer - fades in + rises from y:20
export const sectionBgVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', delay: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// Main content layer - fades in last
export const sectionContentVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay: 0.5 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// For pages without planets, simpler timing
export const sectionBgNoIntroVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

export const sectionContentNoIntroVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// ── Homepage Planet Exit Variants ──
// Planets slide to their nearest side and fade out
export function planetExitVariants(direction: 'left' | 'right'): Variants {
  const xOffset = direction === 'left' ? -100 : 100

  return {
    initial: { opacity: 1, x: 0 },
    animate: { opacity: 1, x: 0 },
    exit: {
      opacity: 0,
      x: xOffset,
      transition: { duration: 0.4, ease: 'easeIn' },
    },
  }
}

// Maps section IDs to their exit directions based on planet position
export const PLANET_EXIT_DIRECTIONS: Record<string, 'left' | 'right'> = {
  tv: 'right',
  magazine: 'left',
  events: 'right',
  shop: 'left',
  lab: 'right',
}

// ── Homepage Exit Variants ──
// For homepage wrapper - slight scale down on exit
export const homepageExitVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
}

// ── Default Page Variants ──
export const defaultPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
}

// ── Section Page Variants ──
export const sectionPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
}

// ── Reduced Motion Variants ──
export const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.01 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.01 },
  },
}
