import type { Enemy, GameState } from '../types'

export function moveEnemies(state: GameState): void {
  const { enemies, enemyWidth, dimensions, dropStep } = state

  state.enemyShootTicker++
  if (state.enemyShootTicker >= state.enemyShootInterval) {
    shootEnemyBullet(state)
    state.enemyShootTicker = 0
  }

  if (!enemies.length) return

  let leftEdge = Infinity
  let rightEdge = -Infinity

  state.enemyTicker++
  if (state.enemyTicker % 20 === 0) state.enemyImgFrame *= -1

  for (const e of enemies) {
    if (e.status === 0) {
      continue
    } else if (e.status === 2) {
      if (e.exploding) {
        e.explodeTimer--
        if (e.explodeTimer <= 0) {
          e.exploding = false
          e.status = 0 // dead
          state.enemies = enemies.filter((x) => x.status !== 0)
          continue
        }
      }
    } else {
      const x = e.x + state.enemyOffsetX
      if (x < leftEdge) leftEdge = x
      if (x + enemyWidth > rightEdge) rightEdge = x + enemyWidth
    }
  }

  const hitLeft = leftEdge <= 0
  const hitRight = rightEdge >= dimensions.width

  // Smooth drop
  if (state.dropping) {
    const dropSpeed = 2
    state.enemyDropY += dropSpeed
    if (state.enemyDropY >= state.targetDropY) {
      state.enemyDropY = state.targetDropY
      state.dropping = false
    }
    return // no horizontal move while dropping
  }

  if (hitLeft && state.dir < 0) {
    state.dir = 1
    state.targetDropY = state.enemyDropY + dropStep
    state.dropping = true
    return
  }

  if (hitRight && state.dir > 0) {
    state.dir = -1
    state.targetDropY = state.enemyDropY + dropStep
    state.dropping = true
    return
  }

  state.moveSpeed += 0.003
  state.enemyOffsetX += state.dir * state.moveSpeed
}

export function initEnemies(state: GameState): Enemy[] {
  const enemies: Enemy[] = []
  const {
    enemyCols,
    enemyRows,
    enemyWidth,
    enemyHeight,
    enemyPadding,
    enemyOffsetLeft,
    dimensions,
  } = state

  const startY = dimensions.height - state.enemyOffsetBottom - enemyHeight

  for (let r = 0; r < enemyRows; r++) {
    for (let c = 0; c < enemyCols; c++) {
      const y = startY - r * (enemyHeight + enemyPadding)
      // Start just above the top of the screen.
      const introFrom = -(y + enemyHeight + 80)
      enemies.push({
        x: c * (enemyWidth + enemyPadding) + enemyOffsetLeft,
        y,
        width: enemyWidth,
        height: enemyHeight,
        status: 1, // alive
        exploding: false,
        explodeTimer: 10,
        explosionImage: Math.floor(
          Math.random() * state.sprites.explosions.length,
        ),
        frameIndex: Math.floor(Math.random() * 4),
        introFrom,
        introY: introFrom,
        // Rows cascade in top-first, each 120ms behind the one above.
        introDelay: (enemyRows - 1 - r) * 120,
      })
    }
  }
  return enemies
}

export function shootEnemyBullet(state: GameState): void {
  const { enemyBullets, enemies } = state
  const aliveEnemies = enemies.filter((e) => e.status === 1)
  if (aliveEnemies.length === 0) return

  const shooter =
    aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]

  const sx = shooter.x + state.enemyOffsetX + shooter.width / 2 - 3
  const sy = shooter.y + state.enemyDropY + shooter.height

  enemyBullets.push({
    x: sx,
    y: sy,
    width: 18,
    height: 36,
    speed: 4 + Math.random() * 6,
    frameIndex: Math.floor(Math.random() * state.sprites.bullets.length),
  })
}

export function moveEnemyBullets(state: GameState): void {
  state.bulletTicker++
  if (state.bulletTicker % 5 === 0) state.bulletImgFrame *= -1

  const { enemyBullets, dimensions } = state
  for (const b of enemyBullets) {
    b.y += b.speed
    if (b.y > dimensions.height) {
      enemyBullets.splice(enemyBullets.indexOf(b), 1)
    }
  }
}
