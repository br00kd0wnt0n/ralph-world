import type { GameState } from '../types'

export const INTRO_MS = 2000
const MOVE_MS = 1100 // per-alien travel time (after its row delay)
const FRAME_MS = 1000 / 60
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

// 2-second fly-in: aliens drop into formation from above, row by row (each row
// slightly delayed), while the ship rises from below. Controls / shooting /
// marching stay off until it completes.
export function stepIntro(state: GameState): void {
  state.introElapsed += FRAME_MS
  const done = state.introElapsed >= INTRO_MS

  for (const e of state.enemies) {
    const p = done
      ? 1
      : easeOut(Math.min(1, Math.max(0, (state.introElapsed - e.introDelay) / MOVE_MS)))
    e.introY = e.introFrom * (1 - p)
  }

  const pp = done ? 1 : easeOut(Math.min(1, state.introElapsed / INTRO_MS))
  state.player.introY = state.player.introFrom * (1 - pp)

  if (done) state.phase = 'playing'
}
