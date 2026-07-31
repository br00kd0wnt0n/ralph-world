import type { GameState } from '../types'
import { playSfx } from '../sfx'

export function detectCollisions(state: GameState): void {
  const { bullets, enemyBullets, enemies, enemyOffsetX, enemyDropY, player } =
    state

  // Player bullets vs enemies
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    for (const e of enemies) {
      if (e.status !== 1) continue
      const ex = e.x + enemyOffsetX
      const ey = e.y + enemyDropY

      const hit =
        b.x > ex + 10 &&
        b.x < ex + e.width - 10 &&
        b.y < ey + e.height &&
        b.y + b.height > ey

      if (hit) {
        e.status = 2
        e.exploding = true
        e.explodeTimer = 10
        bullets.splice(i, 1)
        state.score += 1 // 1 point per alien

        // Win when no alive invaders remain.
        if (!state.enemies.some((en) => en.status === 1)) {
          state.gameOver = 1
        }
        break
      }
    }
  }

  // Enemy bullets vs player
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i]
    const hit =
      b.x < player.x + player.width &&
      b.x + b.width > player.x &&
      b.y + b.height > player.y &&
      b.y < player.y + player.height

    if (hit) {
      player.explodeTimer = 10
      player.status = 2
      enemyBullets.splice(i, 1)
      playSfx('playerDeath')
      break
    }
  }

  // Enemy overlaps player
  for (const e of enemies) {
    if (e.status !== 1) continue
    const ex = e.x + enemyOffsetX
    const ey = e.y + enemyDropY

    const overlap =
      ex < player.x + player.width &&
      ex + e.width > player.x &&
      ey < player.y + player.height &&
      ey + e.height > player.y

    if (overlap) {
      player.explodeTimer = 10
      player.status = 2
      playSfx('playerDeath')
      break
    }
  }
}
