// Sound effects. Files live in /public/sfx.
const SFX: Record<string, string> = {
  shoot: '/sfx/laser.mp3',
  playerDeath: '/sfx/wilhelmscream.mp3',
  lose: '/sfx/aliens-game-over.mp3',
  facehugger: '/sfx/facehugger-trill.mp3',
}

export function playSfx(name: string): void {
  if (typeof window === 'undefined') return
  const src = SFX[name]
  if (!src) return
  try {
    const audio = new Audio(src)
    audio.volume = 0.4
    void audio.play().catch(() => {})
  } catch {
    // ignore audio failures (autoplay policy, missing file, etc.)
  }
}
