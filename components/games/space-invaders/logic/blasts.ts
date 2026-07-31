import type { GameState } from '../types'
import { getBgTargets, hitBgTarget } from '@/lib/bg-flyer-targets'
import { playSfx } from '../sfx'

const BLAST_RADIUS = 200
const BLAST_LIFE = 26

// Detonate a 200px blast at (cx, cy): draw a shockwave and destroy every alive
// invader within the radius.
function detonate(state: GameState, cx: number, cy: number): void {
  state.blasts.push({
    x: cx,
    y: cy,
    radius: 0,
    maxRadius: BLAST_RADIUS,
    life: BLAST_LIFE,
    maxLife: BLAST_LIFE,
  })
  playSfx('facehugger')
  state.score += 5 // 5 points for the satellite / chaser

  for (const e of state.enemies) {
    if (e.status !== 1) continue
    const ex = e.x + state.enemyOffsetX + e.width / 2
    const ey = e.y + state.enemyDropY + e.height / 2
    if (Math.hypot(ex - cx, ey - cy) <= BLAST_RADIUS) {
      e.status = 2
      e.exploding = true
      e.explodeTimer = 10
      state.score += 1 // 1 point per alien caught in the blast
    }
  }
  // Win when no alive invaders remain.
  if (!state.enemies.some((en) => en.status === 1)) state.gameOver = 1
}

// Player bullets vs the background flyers (satellite / chaser). A hit knocks the
// flyer out and triggers the blast.
export function detectBgTargetHits(state: GameState): void {
  const targets = getBgTargets()
  if (!targets.length) return

  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi]
    for (let ti = 0; ti < targets.length; ti++) {
      const t = targets[ti]
      if (!t) continue
      const left = t.x - t.w / 2
      const right = t.x + t.w / 2
      const top = t.y - t.h / 2
      const bottom = t.y + t.h / 2
      const hit =
        b.x < right &&
        b.x + b.width > left &&
        b.y < bottom &&
        b.y + b.height > top
      if (hit) {
        state.bullets.splice(bi, 1)
        hitBgTarget(ti)
        detonate(state, t.x, t.y)
        break
      }
    }
  }
}

export function moveBlasts(state: GameState): void {
  for (let i = state.blasts.length - 1; i >= 0; i--) {
    const bl = state.blasts[i]
    bl.life -= 1
    bl.radius = bl.maxRadius * (1 - bl.life / bl.maxLife)
    if (bl.life <= 0) state.blasts.splice(i, 1)
  }
}
