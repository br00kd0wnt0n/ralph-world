import type { GameState, Keys, Player } from '../types'
import { playSfx } from '../sfx'

export function initPlayer(state: GameState): Player {
  const width = 60
  const y = state.playerStartY - 69
  // Start below the bottom of the screen, then rise into position.
  const introFrom = state.dimensions.height + 140 - y
  return {
    x: (state.dimensions.width - width) / 2, // centre horizontally
    y,
    width,
    height: 69,
    speed: 5,
    status: 1,
    explodeTimer: 10,
    exhaustX: 30,
    exhaustY: 60,
    vx: 0,
    introFrom,
    introY: introFrom,
  }
}

export function movePlayer(state: GameState, keys: Keys): void {
  const { player, dimensions } = state
  if (player.vx === undefined) player.vx = 0

  const accel = 0.4
  const friction = 0.85
  const maxSpeed = 8

  if (keys.right) player.vx += accel
  if (keys.left) player.vx -= accel

  if (!keys.right && !keys.left) {
    player.vx *= friction
    if (Math.abs(player.vx) < 0.05) player.vx = 0
  }

  player.vx = Math.max(Math.min(player.vx, maxSpeed), -maxSpeed)
  player.x += player.vx
  player.x = Math.max(0, Math.min(player.x, dimensions.width - player.width))
}

export function shootBullet(state: GameState, keys: Keys): void {
  const { bullets, player, sprites } = state
  if (keys.space) {
    state.bulletSide *= -1
    bullets.push({
      x: state.bulletSide > 0 ? player.x + player.width - 10 : player.x + 2,
      y: player.y - 15,
      width: 10,
      height: 26,
      speed: 6 + Math.random() * 2,
      frameIndex: Math.floor(Math.random() * sprites.bullets.length),
    })
    playSfx('shoot')
    keys.space = false
  }
}

export function moveBullets(state: GameState): void {
  const { bullets } = state
  for (const b of bullets) {
    b.y -= b.speed
    if (b.y + b.height < 100) {
      bullets.splice(bullets.indexOf(b), 1)
    }
  }
}
