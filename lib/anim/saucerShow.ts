// Saucer "show" — a self-contained canvas actor driven by CanvasStage.
//
// Solo: a saucer enters from a random side/bottom → moves to a hover point →
// bobs → (often) does a 360 spin with a back-ease → flies off.
// Fight (occasional): while one saucer hovers, a second enters and they roam,
// dodge and shoot (bullet sheet) at each other until one is hit — an explosion
// (explosion sheet) plays where it was and the other flies off.

import { ANIMATIONS } from './animations'

type View = () => { vw: number; vh: number }

const SAUCER = ANIMATIONS['saucer']
const BULLET = ANIMATIONS['bullet']
const EXPLOSION = ANIMATIONS['explosion']

// Show pacing — first appearance 1–5 min after load, then repeats every 10 min.
const FIRST_MIN = 60_000
const FIRST_MAX = 300_000
const GAP_MIN = 600_000
const GAP_MAX = 600_000
const FIGHT_CHANCE = 0.35

// Saucer feel
const SAUCER_SCALE = 0.55
const ENTER_MS = 1100
const HOVER_MIN = 2500
const HOVER_MAX = 5000
const SPIN_CHANCE = 0.7
const SPIN_MS = 750
const IDLE_SPIN_FPS = 7 // gentle constant rotation while not doing a 360
const BOB_AMP = 9
const BOB_W = 0.003
const LEAVE_ACCEL = 0.0045

// Fight feel
const FIGHTER_DELAY = 1400 // second saucer enters this long after the first
const FIGHT_MIN = 5000
const FIGHT_MAX = 9000
const ROAM_MIN = 700
const ROAM_MAX = 1500
const FIRE_MIN = 480
const FIRE_MAX = 1100
const BULLET_SPEED = 0.8 // px/ms
const BULLET_SCALE = 0.8
const BULLET_FPS = 16
const EXPLOSION_SCALE = 1.3

// z-tilt: banks slightly with horizontal velocity for more natural movement
const TILT_MAX = 0.2 // radians (~11°)
const TILT_K = 0.6 // tilt per px/ms of horizontal velocity
const TILT_EASE = 0.008 // per-ms approach rate

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

type SaucerState = 'enter' | 'hover' | 'spin' | 'fight' | 'leave' | 'dead'
interface Saucer {
  x: number
  y: number
  fromX: number
  fromY: number
  tx: number
  ty: number
  vx: number
  vy: number
  scale: number
  tilt: number // current z-rotation (banks with horizontal movement)
  prevX: number
  frame: number // float; mod count when drawn
  state: SaucerState
  stateT: number
  enterT: number
  hoverMs: number
  hoverBaseY: number
  bobSeed: number
  spinT: number
  spinStart: number
  roamCd: number
  fireCd: number
  leaveX: number
  leaveY: number
}
interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  frame: number
  acc: number
  dist: number
  maxDist: number
}
interface Explosion {
  x: number
  y: number
  frame: number
  acc: number
}

export function createSaucerShow(ctx: CanvasRenderingContext2D, view: View) {
  const saucerImg = new Image()
  saucerImg.src = SAUCER.src
  const bulletImg = new Image()
  bulletImg.src = BULLET.src
  const explosionImg = new Image()
  explosionImg.src = EXPLOSION.src

  let mode: 'idle' | 'solo' | 'fight' = 'idle'
  let nextShowAt = rand(FIRST_MIN, FIRST_MAX)
  let fightEndAt = 0
  let fighterBPendingAt = 0 // when to spawn the 2nd fighter (0 = none pending)
  const saucers: Saucer[] = []
  const bullets: Bullet[] = []
  const explosions: Explosion[] = []

  function spawnSaucer(scale = SAUCER_SCALE): Saucer {
    const { vw, vh } = view()
    const w = SAUCER.frameW * scale
    const tx = rand(vw * 0.18, vw * 0.82)
    const ty = rand(vh * 0.14, vh * 0.5)
    // enter from a random side or the bottom (never the top)
    const edge = Math.floor(rand(0, 3)) // 0 left, 1 right, 2 bottom
    let fromX = tx
    let fromY = ty
    if (edge === 0) {
      fromX = -w
      fromY = ty
    } else if (edge === 1) {
      fromX = vw + w
      fromY = ty
    } else {
      fromX = tx
      fromY = vh + w
    }
    return {
      x: fromX,
      y: fromY,
      fromX,
      fromY,
      tx,
      ty,
      vx: 0,
      vy: 0,
      scale,
      tilt: 0,
      prevX: fromX,
      frame: rand(0, SAUCER.count),
      state: 'enter',
      stateT: 0,
      enterT: 0,
      hoverMs: rand(HOVER_MIN, HOVER_MAX),
      hoverBaseY: ty,
      bobSeed: rand(0, Math.PI * 2),
      spinT: 0,
      spinStart: 0,
      roamCd: rand(ROAM_MIN, ROAM_MAX),
      fireCd: rand(FIRE_MIN, FIRE_MAX),
      leaveX: 0,
      leaveY: 0,
    }
  }

  function startLeave(s: Saucer) {
    const { vw, vh } = view()
    // head toward the nearest horizontal edge, drifting up a touch
    const dir = s.x < vw / 2 ? -1 : 1
    s.leaveX = dir
    s.leaveY = -0.35
    s.vx = dir * 0.05
    s.vy = -0.05
    s.state = 'leave'
    s.stateT = 0
    void vh
  }

  function offscreen(s: Saucer) {
    const { vw, vh } = view()
    const w = SAUCER.frameW * s.scale
    const h = SAUCER.frameH * s.scale
    return s.x < -w * 1.5 || s.x > vw + w * 1.5 || s.y < -h * 1.5 || s.y > vh + h * 1.5
  }

  function fireBullet(from: Saucer, target: Saucer) {
    const dx = target.x - from.x
    const dy = target.y - from.y
    const len = Math.hypot(dx, dy) || 1
    bullets.push({
      x: from.x,
      y: from.y,
      vx: (dx / len) * BULLET_SPEED,
      vy: (dy / len) * BULLET_SPEED,
      angle: Math.atan2(dy, dx) + Math.PI / 2, // sheet points "up"
      frame: 0,
      acc: 0,
      dist: 0,
      maxDist: len + 200,
    })
  }

  function startShow(elapsed: number) {
    if (Math.random() < FIGHT_CHANCE) {
      mode = 'fight'
      saucers.push(spawnSaucer(SAUCER_SCALE * rand(0.82, 0.96))) // first (smaller)
      fighterBPendingAt = elapsed + FIGHTER_DELAY
      fightEndAt = 0
    } else {
      mode = 'solo'
      saucers.push(spawnSaucer())
    }
  }

  function resolveFight(elapsed: number) {
    const alive = saucers.filter((s) => s.state === 'fight')
    if (alive.length < 2) return
    const victim = alive[Math.floor(rand(0, alive.length))]
    explosions.push({ x: victim.x, y: victim.y, frame: 0, acc: 0 })
    victim.state = 'dead'
    bullets.length = 0
    for (const s of alive) if (s !== victim) startLeave(s)
    fightEndAt = 0
    void elapsed
  }

  function updateSaucer(s: Saucer, dt: number, elapsed: number) {
    // idle rotation (unless mid-360)
    if (s.state !== 'spin') s.frame += (IDLE_SPIN_FPS * dt) / 1000

    if (s.state === 'enter') {
      s.enterT += dt
      const p = clamp(s.enterT / ENTER_MS, 0, 1)
      const e = easeOutCubic(p)
      s.x = s.fromX + (s.tx - s.fromX) * e
      s.y = s.fromY + (s.ty - s.fromY) * e
      if (p >= 1) {
        s.state = mode === 'fight' ? 'fight' : 'hover'
        s.stateT = 0
        s.hoverBaseY = s.ty
      }
    } else if (s.state === 'hover') {
      s.stateT += dt
      s.y = s.hoverBaseY + Math.sin(elapsed * BOB_W + s.bobSeed) * BOB_AMP
      if (s.stateT > s.hoverMs) {
        if (Math.random() < SPIN_CHANCE) {
          s.state = 'spin'
          s.spinT = 0
          s.spinStart = s.frame
        } else {
          startLeave(s)
        }
      }
    } else if (s.state === 'spin') {
      s.spinT += dt
      const p = clamp(s.spinT / SPIN_MS, 0, 1)
      s.frame = s.spinStart + easeOutBack(p) * SAUCER.count
      s.y = s.hoverBaseY + Math.sin(elapsed * BOB_W + s.bobSeed) * BOB_AMP
      if (p >= 1) startLeave(s)
    } else if (s.state === 'fight') {
      const { vw, vh } = view()
      s.roamCd -= dt
      if (s.roamCd <= 0) {
        s.tx = rand(vw * 0.15, vw * 0.85)
        s.ty = rand(vh * 0.12, vh * 0.55)
        s.roamCd = rand(ROAM_MIN, ROAM_MAX)
      }
      const k = Math.min(1, dt * 0.004)
      s.x += (s.tx - s.x) * k
      s.y += (s.ty - s.y) * k + Math.sin(elapsed * BOB_W * 2 + s.bobSeed) * 0.6
      // fire at the other fighter
      const other = saucers.find((o) => o !== s && o.state === 'fight')
      if (other) {
        s.fireCd -= dt
        if (s.fireCd <= 0) {
          fireBullet(s, other)
          s.fireCd = rand(FIRE_MIN, FIRE_MAX)
        }
      }
    } else if (s.state === 'leave') {
      s.vx += s.leaveX * LEAVE_ACCEL * dt
      s.vy += s.leaveY * LEAVE_ACCEL * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      if (offscreen(s)) s.state = 'dead'
    }

    // bank slightly toward horizontal travel direction
    const hVel = dt > 0 ? (s.x - s.prevX) / dt : 0
    s.prevX = s.x
    const targetTilt = clamp(hVel * TILT_K, -TILT_MAX, TILT_MAX)
    s.tilt += (targetTilt - s.tilt) * Math.min(1, TILT_EASE * dt)
  }

  function update(dt: number, elapsed: number) {
    if (mode === 'idle' && elapsed >= nextShowAt) startShow(elapsed)

    // spawn the 2nd fighter once the first is settling in
    if (mode === 'fight' && fighterBPendingAt && elapsed >= fighterBPendingAt) {
      saucers.push(spawnSaucer(SAUCER_SCALE * rand(1.05, 1.2))) // second (larger)
      fighterBPendingAt = 0
      fightEndAt = elapsed + rand(FIGHT_MIN, FIGHT_MAX)
      // ensure the first saucer joins the fight even if still hovering
      for (const s of saucers) if (s.state === 'hover') s.state = 'fight'
    }

    for (const s of saucers) updateSaucer(s, dt, elapsed)

    if (mode === 'fight' && fightEndAt && elapsed >= fightEndAt) resolveFight(elapsed)

    // bullets
    for (const b of bullets) {
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.dist += BULLET_SPEED * dt
      b.acc += dt
      const ms = 1000 / BULLET_FPS
      while (b.acc >= ms) {
        b.acc -= ms
        b.frame = (b.frame + 1) % BULLET.count
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (bullets[i].dist > bullets[i].maxDist) bullets.splice(i, 1)
    }

    // explosions
    for (const e of explosions) {
      e.acc += dt
      const ms = 1000 / (EXPLOSION.fps ?? 18)
      while (e.acc >= ms) {
        e.acc -= ms
        e.frame += 1
      }
    }
    for (let i = explosions.length - 1; i >= 0; i--) {
      if (explosions[i].frame >= EXPLOSION.count) explosions.splice(i, 1)
    }

    // cleanup dead saucers
    for (let i = saucers.length - 1; i >= 0; i--) {
      if (saucers[i].state === 'dead') saucers.splice(i, 1)
    }

    // show over?
    if (
      mode !== 'idle' &&
      saucers.length === 0 &&
      bullets.length === 0 &&
      explosions.length === 0
    ) {
      mode = 'idle'
      nextShowAt = elapsed + rand(GAP_MIN, GAP_MAX)
    }
  }

  function draw() {
    if (saucerImg.complete && saucerImg.naturalWidth > 0) {
      for (const s of saucers) {
        const w = SAUCER.frameW * s.scale
        const h = SAUCER.frameH * s.scale
        const f = ((Math.floor(s.frame) % SAUCER.count) + SAUCER.count) % SAUCER.count
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.tilt)
        ctx.drawImage(saucerImg, f * SAUCER.frameW, 0, SAUCER.frameW, SAUCER.frameH, -w / 2, -h / 2, w, h)
        ctx.restore()
      }
    }

    if (bulletImg.complete && bulletImg.naturalWidth > 0) {
      const w = BULLET.frameW * BULLET_SCALE
      const h = BULLET.frameH * BULLET_SCALE
      for (const b of bullets) {
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.rotate(b.angle)
        ctx.drawImage(bulletImg, b.frame * BULLET.frameW, 0, BULLET.frameW, BULLET.frameH, -w / 2, -h / 2, w, h)
        ctx.restore()
      }
    }

    if (explosionImg.complete && explosionImg.naturalWidth > 0) {
      const w = EXPLOSION.frameW * EXPLOSION_SCALE
      const h = EXPLOSION.frameH * EXPLOSION_SCALE
      for (const e of explosions) {
        const f = Math.min(e.frame, EXPLOSION.count - 1)
        ctx.drawImage(explosionImg, f * EXPLOSION.frameW, 0, EXPLOSION.frameW, EXPLOSION.frameH, e.x - w / 2, e.y - h / 2, w, h)
      }
    }
  }

  return { update, draw }
}
