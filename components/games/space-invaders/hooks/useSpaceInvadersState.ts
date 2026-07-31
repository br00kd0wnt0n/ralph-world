import { useRef } from 'react'
import type { GameState, Keys, Sprites } from '../types'
import { SPRITE_PATHS } from '../assets'
import { initEnemies, moveEnemies, moveEnemyBullets } from '../logic/enemies'
import { initPlayer, movePlayer, shootBullet, moveBullets } from '../logic/player'
import { detectCollisions } from '../logic/collisions'
import { detectBgTargetHits, moveBlasts } from '../logic/blasts'
import { stepIntro } from '../logic/intro'

export function useSpaceInvadersState() {
  const state = useRef<GameState>({
    player: {} as GameState['player'],
    bullets: [],
    stars: [],
    enemyBullets: [],
    enemies: [],
    blasts: [],
    blastColor: '#EA128B',
    dropStep: 40,
    dimensions: { width: 800, height: 600 },
    score: 0,
    gameOver: -1,
    phase: 'intro',
    introElapsed: 0,
    sprites: {} as Sprites,
    spritePaths: SPRITE_PATHS,

    dir: 1,
    moveSpeed: 1,
    starCount: 50,
    enemyImgFrame: 1,
    enemyTicker: 0,
    enemyWaveSize: 32,
    enemyCols: 10,
    enemyRows: 8,
    enemyWidth: 72,
    enemyHeight: 72,
    enemyPadding: 12,
    enemyOffsetLeft: 60,
    enemyOffsetX: 0,
    enemyDropY: 0,
    targetDropY: 0,
    dropping: false,
    enemyOffsetBottom: 500,
    enemySpawnTimer: 0,
    enemySpawnInterval: 600,
    totalWavesSpawned: 0,
    enemyTotal: 0,
    enemyShootTicker: 0,
    enemyShootInterval: 60,
    playerStartY: 0,
    bulletSide: 1,
    bulletImgFrame: 1,
    bulletTicker: 0,
    exhaustTick: 0,
    exhaustFrame: 0,
  })

  const setupGame = (canvas: HTMLCanvasElement) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const s = state.current

    s.dimensions = { width: w, height: h }
    s.dir = 1
    s.moveSpeed = 1
    s.starCount = 50
    s.enemyImgFrame = 1
    s.enemyTicker = 0
    s.enemyWaveSize = 32
    s.enemyCols = 10
    s.enemyRows = 8
    s.enemyWidth = 72
    s.enemyHeight = 72
    s.enemyPadding = 12
    // Centre the alien block horizontally.
    {
      const blockWidth =
        s.enemyCols * (s.enemyWidth + s.enemyPadding) - s.enemyPadding
      s.enemyOffsetLeft = Math.max(0, (w - blockWidth) / 2)
    }
    s.enemyOffsetX = 0
    s.enemyDropY = 0
    s.targetDropY = 0
    s.dropping = false
    s.enemyOffsetBottom = 500
    s.enemySpawnTimer = 0
    s.enemySpawnInterval = 600
    s.totalWavesSpawned = 0
    s.enemyTotal = s.enemyCols * s.enemyRows
    s.enemyBullets = []
    s.enemyShootTicker = 0
    s.enemyShootInterval = 60

    s.playerStartY = window.innerHeight - 120
    s.enemies = initEnemies(s)
    s.player = initPlayer(s)

    s.bullets.length = 0
    s.blasts.length = 0
    s.bulletSide = 1
    s.bulletImgFrame = 1
    s.bulletTicker = 0
    s.exhaustTick = 0
    s.exhaustFrame = 0
    s.score = 0
    s.gameOver = 0
    s.phase = 'intro'
    s.introElapsed = 0
  }

  const resetGame = () => {
    const s = state.current
    s.bullets.length = 0
    s.enemyBullets.length = 0
    s.enemies.length = 0
    s.score = 0
    s.gameOver = -1
  }

  const stepGame = (keys: Keys) => {
    const s = state.current

    // Intro fly-in: animate positions only; no controls, marching, or fire.
    if (s.phase === 'intro') {
      stepIntro(s)
      return
    }

    if (s.player.status === 1) {
      movePlayer(s, keys)
      shootBullet(s, keys)
    } else if (s.player.status === 2) {
      s.player.explodeTimer--
      if (s.player.explodeTimer <= 0) s.player.status = 0
    } else {
      s.gameOver = 2
      return
    }
    moveEnemies(s)
    moveBullets(s)
    moveEnemyBullets(s)
    detectCollisions(s)
    detectBgTargetHits(s)
    moveBlasts(s)
  }

  return { state: state.current, setupGame, resetGame, stepGame }
}
