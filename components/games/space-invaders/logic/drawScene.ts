import type { GameState, SpriteFrame } from '../types'

// Draw a sprite frame, or a coloured placeholder rect when the asset is missing
// (so the game is playable before the real art lands).
function drawSprite(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  fallback: string,
): void {
  if (frame) {
    ctx.drawImage(frame, x, y, w, h)
  } else {
    ctx.fillStyle = fallback
    ctx.fillRect(x, y, w, h)
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: GameState,
): void {
  const { player, bullets, enemies, enemyBullets, sprites, enemyImgFrame } =
    state
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  // (In-game stars removed — the global Starfield shows through instead.)

  // Player + exhaust
  if (player.status > 0) {
    const playerY = player.y + player.introY
    if (player.status === 1) {
      state.exhaustTick++
      if (state.exhaustTick % 5 === 0) {
        state.exhaustFrame = (state.exhaustFrame + 1) % sprites.exhaust.length
      }
      const px = Math.round(player.x)
      const py = Math.round(playerY)
      drawSprite(
        ctx,
        sprites.exhaust[state.exhaustFrame],
        Math.round(px + player.width / 2 - 15),
        Math.round(py + 60),
        30,
        60,
        '#EE6626',
      )
    }

    const isAlive = player.status === 1
    drawSprite(
      ctx,
      isAlive ? sprites.player[0] : sprites.explosions[0],
      player.x,
      playerY,
      player.width,
      player.height,
      isAlive ? '#5FBCBF' : '#EE6626',
    )
  }

  // Player bullets
  for (const b of bullets) {
    drawSprite(
      ctx,
      sprites.bullets[b.frameIndex % sprites.bullets.length],
      b.x,
      b.y,
      b.width,
      b.height,
      '#FBC000',
    )
  }

  // Enemy bullets
  const eBulletFrame =
    state.bulletImgFrame > 0 ? sprites.ebullets[0] : sprites.ebullets[1]
  for (const b of enemyBullets) {
    drawSprite(ctx, eBulletFrame, b.x, b.y, b.width, b.height, '#EA128B')
  }

  // Blast shockwaves (from shooting a background flyer) — pink in dark mode,
  // monochrome in light (colour set from the theme by the component).
  for (const bl of state.blasts) {
    const alpha = Math.max(0, bl.life / bl.maxLife)
    ctx.save()
    ctx.globalAlpha = alpha * 0.25
    ctx.fillStyle = state.blastColor
    ctx.beginPath()
    ctx.arc(bl.x, bl.y, bl.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = state.blastColor
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()
  }

  // Enemies
  for (const e of enemies) {
    const frame =
      enemyImgFrame > 0
        ? sprites.enemies[e.frameIndex % sprites.enemies.length]
        : sprites.enemiesAlt[e.frameIndex % sprites.enemiesAlt.length]
    drawSprite(
      ctx,
      e.status === 2 && e.exploding ? sprites.explosions[e.explosionImage] : frame,
      e.x + state.enemyOffsetX,
      e.y + state.enemyDropY + e.introY,
      e.width,
      e.height,
      e.status === 2 && e.exploding ? '#EE6626' : '#44B758',
    )
  }
}
