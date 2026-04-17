'use client'

// Iframe embed of the visual-canvas-lab (deployed separately on Railway).
// Acts as a full-viewport background for the 'ralph-world' theme.
//
// Why iframe and not a React component import:
// - canvas-lab targets React 18 + Next 14; ralph-world is React 19 + Next 16,
//   which breaks @react-three/fiber 8.x
// - isolates the canvas' known stability issues (see canvas-lab's
//   CRASH_ANALYSIS.md) from the main app
// - canvas-lab can keep evolving independently; we just swap the URL

const CANVAS_URL = 'https://ralph-visual-canvas-production.up.railway.app/?p=LANDING'

export default function CanvasBackground() {
  return (
    <iframe
      src={CANVAS_URL}
      title="Ralph visual canvas"
      aria-hidden
      tabIndex={-1}
      loading="lazy"
      className="fixed inset-0 w-screen h-screen border-0 pointer-events-none -z-10"
      // Allow WebGL + autoplay; no need for scripts-from-other-origins etc.
      sandbox="allow-scripts allow-same-origin"
    />
  )
}
