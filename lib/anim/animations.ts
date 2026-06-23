// Animation registry ("scripts"). Each entry describes a sprite sheet:
// a single horizontal row of `count` frames, each `frameW × frameH`.
// Add new packed sheets here and reference them by name via <SpriteAnimation>.

export interface SpriteSheet {
  /** Path under /public to the packed sheet (single horizontal row). */
  src: string
  /** Width of one frame cell in px. */
  frameW: number
  /** Height of one frame cell in px. */
  frameH: number
  /** Number of frames in the row. */
  count: number
  /** Default playback rate. */
  fps?: number
}

export const ANIMATIONS = {
  'bouncing-alien': {
    src: '/animations/bouncing-alien.png',
    frameW: 255,
    frameH: 442,
    count: 14,
    fps: 14,
  },
  exhaust: {
    src: '/animations/exhaust.png',
    frameW: 230,
    frameH: 350,
    count: 10,
    fps: 18,
  },
  satellite: {
    src: '/animations/satellite.png',
    frameW: 376,
    frameH: 282,
    count: 28,
    fps: 16,
  },
  saucer: {
    src: '/animations/saucer.png',
    frameW: 374,
    frameH: 246,
    count: 36,
    fps: 24,
  },
  'got-coin': {
    src: '/animations/got-coin.png',
    frameW: 398,
    frameH: 454,
    count: 9,
    fps: 12,
  },
  'eyed-alien': {
    src: '/animations/eyed-alien.png',
    frameW: 179,
    frameH: 327,
    count: 6,
    fps: 10,
  },
  chaser: {
    src: '/animations/chaser.png',
    frameW: 402,
    frameH: 212,
    count: 2,
    fps: 6,
  },
  bullet: {
    src: '/animations/bullet.png',
    frameW: 40,
    frameH: 80,
    count: 5,
    fps: 16,
  },
  explosion: {
    src: '/animations/explosion.png',
    frameW: 144,
    frameH: 144,
    count: 5,
    fps: 18,
  },
} satisfies Record<string, SpriteSheet>

export type AnimationName = keyof typeof ANIMATIONS
