// Shared types for the Space Invaders game (refactored from the original JS).

export interface Bullet {
  x: number
  y: number
  width: number
  height: number
  speed: number
  frameIndex: number
}

export interface Enemy {
  x: number
  y: number
  width: number
  height: number
  status: number // 0 dead, 1 alive, 2 exploding
  exploding: boolean
  explodeTimer: number
  explosionImage: number
  frameIndex: number
  // Intro fly-in: vertical offset from the resting position, eased to 0.
  introY: number
  introFrom: number
  introDelay: number
}

export interface Star {
  x: number
  y: number
  width: number
  height: number
  speed: number
  frameIndex: number
}

export interface Player {
  x: number
  y: number
  width: number
  height: number
  speed: number
  status: number // 0 dead, 1 alive, 2 exploding
  explodeTimer: number
  exhaustX: number
  exhaustY: number
  vx?: number
  // Intro fly-in: vertical offset from the resting position, eased to 0.
  introY: number
  introFrom: number
}

export interface Blast {
  x: number
  y: number
  radius: number
  maxRadius: number
  life: number
  maxLife: number
}

export interface Keys {
  left: boolean
  right: boolean
  space: boolean
}

export type SpriteKey =
  | 'player'
  | 'bullets'
  | 'ebullets'
  | 'enemies'
  | 'enemiesAlt'
  | 'stars'
  | 'explosions'
  | 'exhaust'

// A loaded sprite frame, or null when the asset is missing — drawn as a
// coloured placeholder rect until the real art lands.
export type SpriteFrame = CanvasImageSource | null
export type Sprites = Record<SpriteKey, SpriteFrame[]>

export interface GameState {
  player: Player
  bullets: Bullet[]
  stars: Star[]
  enemyBullets: Bullet[]
  enemies: Enemy[]
  blasts: Blast[]
  blastColor: string
  dropStep: number
  dimensions: { width: number; height: number }
  score: number
  gameOver: number // -1 idle, 0 playing, 1 win, 2 lose
  phase: 'intro' | 'playing'
  introElapsed: number
  sprites: Sprites
  spritePaths: Record<SpriteKey, string[]>

  dir: number
  moveSpeed: number
  starCount: number
  enemyImgFrame: number
  enemyTicker: number
  enemyWaveSize: number
  enemyCols: number
  enemyRows: number
  enemyWidth: number
  enemyHeight: number
  enemyPadding: number
  enemyOffsetLeft: number
  enemyOffsetX: number
  enemyDropY: number
  targetDropY: number
  dropping: boolean
  enemyOffsetBottom: number
  enemySpawnTimer: number
  enemySpawnInterval: number
  totalWavesSpawned: number
  enemyTotal: number
  enemyShootTicker: number
  enemyShootInterval: number
  playerStartY: number
  bulletSide: number
  bulletImgFrame: number
  bulletTicker: number
  exhaustTick: number
  exhaustFrame: number
}
