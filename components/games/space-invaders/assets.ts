import type { GameState, SpriteKey, SpriteFrame } from './types'

// Asset manifest — placeholder paths under /public/games/space-invaders/. Drop
// the real sprites there and the game picks them up automatically; any missing
// file falls back to a coloured rect so the game still runs.
const BASE = '/imgs/game'
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

export const SPRITE_PATHS: Record<SpriteKey, string[]> = {
  player: [`${BASE}/spaceship.png`],
  bullets: range(5).map((n) => `${BASE}/bullet_${n}.png`),
  // No dedicated enemy-bullet art yet — reuse two of the bullet frames.
  ebullets: [`${BASE}/bullet_4.png`, `${BASE}/bullet_5.png`],
  enemies: range(4).map((n) => `${BASE}/alien_${n}_1.png`),
  enemiesAlt: range(4).map((n) => `${BASE}/alien_${n}_2.png`),
  stars: range(6).map((n) => `${BASE}/star_${n}.png`),
  explosions: range(5).map((n) => `${BASE}/explosion_${n}.png`),
  // exhaust_*.png not supplied yet → falls back to a coloured rect.
  exhaust: range(5).map((n) => `${BASE}/exhaust_${n}.png`),
}

// Decode an image and cache it to an offscreen canvas (fast repeated
// drawImage). Returns null when the asset is missing/unreadable.
async function loadFrame(src: string): Promise<SpriteFrame> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const cctx = canvas.getContext('2d')
    if (!cctx) return img
    cctx.drawImage(img, 0, 0)
    return canvas
  } catch {
    return null
  }
}

// The ship exhaust reuses the site's exhaust sprite SHEET (10 frames across),
// sliced into individual frame canvases.
const EXHAUST_SHEET = {
  src: '/animations/exhaust.png',
  frameW: 230,
  frameH: 350,
  count: 10,
}

async function loadSheetFrames(sheet: typeof EXHAUST_SHEET): Promise<SpriteFrame[]> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = sheet.src
    await img.decode()
    const frames: SpriteFrame[] = []
    for (let i = 0; i < sheet.count; i++) {
      const c = document.createElement('canvas')
      c.width = sheet.frameW
      c.height = sheet.frameH
      const cx = c.getContext('2d')
      if (cx) {
        cx.drawImage(
          img,
          i * sheet.frameW, 0, sheet.frameW, sheet.frameH,
          0, 0, sheet.frameW, sheet.frameH,
        )
      }
      frames.push(c)
    }
    return frames
  } catch {
    return []
  }
}

export async function loadAssets(state: GameState): Promise<void> {
  const keys = (Object.keys(state.spritePaths) as SpriteKey[]).filter(
    (k) => k !== 'exhaust',
  )
  await Promise.all([
    ...keys.map(async (key) => {
      state.sprites[key] = await Promise.all(
        state.spritePaths[key].map(loadFrame),
      )
    }),
    loadSheetFrames(EXHAUST_SHEET).then((frames) => {
      state.sprites.exhaust = frames
    }),
  ])
}
