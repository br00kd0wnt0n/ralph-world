import { useEffect, useRef } from 'react'

// requestAnimationFrame loop, capped at ~60fps, paused when the tab is hidden.
export function useGameLoop(callback: (t: number) => void, active: boolean) {
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    let last = 0
    const frameInterval = 1000 / 60

    const loop = (t: number) => {
      if (t - last > frameInterval) {
        callback(t)
        last = t
      }
      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)

    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frameRef.current)
      else frameRef.current = requestAnimationFrame(loop)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      cancelAnimationFrame(frameRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [callback, active])
}
