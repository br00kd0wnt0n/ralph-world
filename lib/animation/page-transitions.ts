import type { Variants } from 'framer-motion'

// ── Default Page Variants ──
// Simple fade for most page transitions
export const defaultPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.05, ease: 'easeIn' },
  },
}

// ── Section Page Variants ──
// Slide up + fade for section pages (magazine, events, shop, etc.)
export const sectionPageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.05, ease: 'easeIn' },
  },
}

// ── Homepage Exit Variants ──
// Scale down + fade for homepage
export const homepageExitVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.05, ease: 'easeIn' },
  },
}

// ── Planet Exit Variants ──
// Directional slide for homepage planet sections
// Left planets (magazine, lab) slide left; right planets (tv, events, shop) slide right
export function planetExitVariants(direction: 'left' | 'right'): Variants {
  const xOffset = direction === 'left' ? -80 : 80

  return {
    initial: { opacity: 1, x: 0 },
    exit: {
      opacity: 0,
      x: xOffset,
      transition: { duration: 0.1, ease: 'easeIn' },
    },
  }
}

// ── Planet section direction mapping ──
// Maps section IDs to their exit directions based on planet position
export const PLANET_EXIT_DIRECTIONS: Record<string, 'left' | 'right'> = {
  tv: 'right',
  magazine: 'left',
  events: 'right',
  shop: 'left',
  lab: 'right',
}

// ── Reduced Motion Variants ──
// Instant transitions for users who prefer reduced motion
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
