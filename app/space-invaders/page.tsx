import type { Metadata } from 'next'
import SpaceInvaders from '@/components/games/space-invaders/SpaceInvaders'

export const metadata: Metadata = {
  title: 'Space Invaders',
  robots: { index: false, follow: false },
}

// The nav/footer hide themselves on this route; the global Starfield + parallax
// layers show through the transparent game canvas.
export default function SpaceInvadersPage() {
  return (
    <div className="relative w-full" style={{ minHeight: '100vh' }}>
      <SpaceInvaders />
    </div>
  )
}
