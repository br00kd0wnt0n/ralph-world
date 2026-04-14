import type { Variants } from 'framer-motion'

export const SPIN_DURATION_MS = 2500

// Lever rotates down when pulled
export const leverVariants: Variants = {
  idle: { rotate: 0 },
  pulled: {
    rotate: 60,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  reset: {
    rotate: 0,
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
}

// Lights flash during activation
export const lightsVariants: Variants = {
  idle: { opacity: 0.4 },
  active: {
    opacity: [0.4, 1, 0.4, 1, 0.4],
    transition: { duration: 0.6, repeat: Infinity },
  },
  settled: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
}

// Conveyor items scroll right to left
export const conveyorVariants: Variants = {
  idle: { x: 0 },
  spinning: {
    x: ['0%', '-100%'],
    transition: { duration: 1.2, repeat: Infinity, ease: 'linear' },
  },
  settled: {
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

// Bell jar hops when settled
export const bellJarVariants: Variants = {
  idle: { y: 0, scale: 1 },
  highlighted: {
    y: [0, -8, 0],
    scale: [1, 1.05, 1],
    transition: { duration: 0.8, repeat: Infinity, repeatType: 'reverse' },
  },
}

// Lab card reveal
export const labCardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}
