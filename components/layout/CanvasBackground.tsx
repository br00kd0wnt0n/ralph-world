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

// Canvas preset IDs. Using ?preset=<mongo-id> (cloud preset) rather than
// ?p=NAME, because ?p= only reads from the canvas-lab's localStorage —
// first-time visitors have no localStorage entry and would get the
// default preset. List cloud IDs via /api/presets on the canvas deploy.
const CANVAS_ORIGIN = 'https://ralph-visual-canvas-production.up.railway.app'
const PRESET_IDS: Record<string, string> = {
  'ralph-world': '68b1c687dd68f9f4d2c5503e', // LANDING / Basic
  multicolor: '69e25beddd68f9f4d2c5503f',    // MultiColor
}

interface CanvasBackgroundProps {
  presetKey?: keyof typeof PRESET_IDS
}

export default function CanvasBackground({
  presetKey = 'ralph-world',
}: CanvasBackgroundProps) {
  const presetId = PRESET_IDS[presetKey] ?? PRESET_IDS['ralph-world']
  // key forces iframe remount when the preset changes, so the canvas
  // reloads with the new preset rather than keeping the old one cached.
  return (
    <iframe
      key={presetId}
      src={`${CANVAS_ORIGIN}/?preset=${presetId}`}
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
