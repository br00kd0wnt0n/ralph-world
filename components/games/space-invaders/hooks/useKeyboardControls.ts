import { useEffect, useRef } from 'react'
import type { Keys } from '../types'

// Arrow keys to move, Space/Z to shoot. Returns a ref the game loop reads each
// frame (no re-renders).
export function useKeyboardControls() {
  const keys = useRef<Keys>({ left: false, right: false, space: false })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.left = true
      if (e.key === 'ArrowRight') keys.current.right = true
      if (e.key === ' ' || e.key === 'z') keys.current.space = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.left = false
      if (e.key === 'ArrowRight') keys.current.right = false
      if (e.key === ' ' || e.key === 'z') keys.current.space = false
    }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
    }
  }, [])

  return keys
}
