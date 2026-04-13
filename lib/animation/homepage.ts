import type { Variants } from 'framer-motion'

// ── Hero ──
// Title and body paragraphs stagger in from below
export const heroContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}

export const heroChildVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

// ── Planet Sections ──
// Each section fades + slides up as it enters the viewport
export const planetSectionVariants: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
}

// Planet illustration parallax factor — applied via useParallax hook
export const PLANET_PARALLAX_FACTOR = 0.3

// ── Module Flyout Cards ──
// Scale + fade in on hover (desktop) or click (mobile)
export const moduleCardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
}

// ── Floating Characters ──
// Subtle vertical bob, infinite loop, no scroll dependency
export const floatingCharVariants: Variants = {
  float: {
    y: [0, -12, 0],
    transition: {
      duration: 3,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
}

// ── Mobile Cards ──
// Simple fade-in for mobile linear layout
export const mobileCardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}
