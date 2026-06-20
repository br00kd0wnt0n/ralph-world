// Central frame sequencer — ONE requestAnimationFrame loop drives every
// animation on the page. Two kinds of work share the loop:
//
//  - frame-index anims (register):   notified ONLY when their frame index
//    changes (cheap; for DOM sprites like a blink/exhaust).
//  - per-frame tickers (registerTicker): called every frame with dt + elapsed
//    (for the canvas stage that updates positions and redraws).

type Mode = 'loop' | 'once' | 'pingpong'

interface AnimHandle {
  frameCount: number
  fps: number
  durations?: number[] // optional per-frame ms; overrides fps when length matches
  offset: number // ms — shift the timeline to desync identical animations
  mode: Mode
  onFrame: (i: number) => void
  _last: number
}

type Ticker = (dt: number, elapsed: number) => void

const anims = new Set<AnimHandle>()
const tickers = new Set<Ticker>()
let raf = 0
let startTs = 0
let lastElapsed = 0
let hiddenAt = 0

function indexAt(a: AnimHandle, elapsed: number): number {
  const n = a.frameCount
  if (n <= 1) return 0
  const t = elapsed + a.offset

  if (a.durations && a.durations.length === n) {
    const total = a.durations.reduce((s, d) => s + d, 0)
    let p = ((t % total) + total) % total
    let frame = 0
    while (frame < n - 1 && p >= a.durations[frame]) {
      p -= a.durations[frame]
      frame++
    }
    return frame
  }

  const frame = Math.floor(t / (1000 / a.fps))
  if (a.mode === 'once') return Math.min(Math.max(frame, 0), n - 1)
  if (a.mode === 'pingpong') {
    const span = n * 2 - 2
    const q = ((frame % span) + span) % span
    return q < n ? q : span - q
  }
  return ((frame % n) + n) % n
}

function loop(now: number) {
  if (!startTs) startTs = now
  const elapsed = now - startTs
  const dt = lastElapsed ? elapsed - lastElapsed : 16
  lastElapsed = elapsed

  for (const a of anims) {
    const i = indexAt(a, elapsed)
    if (i !== a._last) {
      a._last = i
      a.onFrame(i)
    }
  }
  for (const t of tickers) t(dt, elapsed)

  raf = requestAnimationFrame(loop)
}

function ensureRunning() {
  const visible = typeof document === 'undefined' || !document.hidden
  if (!raf && (anims.size > 0 || tickers.size > 0) && visible) {
    raf = requestAnimationFrame(loop)
  }
}

function maybeStop() {
  if (anims.size === 0 && tickers.size === 0 && raf) {
    cancelAnimationFrame(raf)
    raf = 0
    startTs = 0
    lastElapsed = 0
  }
}

export interface RegisterSpec {
  frameCount: number
  fps?: number
  durations?: number[]
  offset?: number
  mode?: Mode
  onFrame: (i: number) => void
}

/** Register a frame-index animation. Returns an unregister fn (call on unmount). */
export function register(spec: RegisterSpec): () => void {
  const a: AnimHandle = {
    frameCount: spec.frameCount,
    fps: spec.fps ?? 12,
    durations: spec.durations,
    offset: spec.offset ?? 0,
    mode: spec.mode ?? 'loop',
    onFrame: spec.onFrame,
    _last: -1,
  }
  anims.add(a)
  ensureRunning()
  return () => {
    anims.delete(a)
    maybeStop()
  }
}

/** Register a per-frame ticker (dt + elapsed, ms). Returns an unregister fn. */
export function registerTicker(fn: Ticker): () => void {
  tickers.add(fn)
  ensureRunning()
  return () => {
    tickers.delete(fn)
    maybeStop()
  }
}

// Pause when the tab is hidden, and shift the timeline on return so frames
// resume where they left off instead of jumping forward.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
      hiddenAt = performance.now()
    } else if (anims.size > 0 || tickers.size > 0) {
      if (startTs && hiddenAt) startTs += performance.now() - hiddenAt
      raf = requestAnimationFrame(loop)
    }
  })
}
