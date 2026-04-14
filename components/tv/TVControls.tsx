'use client'

import type { TVOverlayState } from './TVSet'

interface TVControlsProps {
  overlay: TVOverlayState
  onToggleOverlay: (state: TVOverlayState) => void
  onFullscreen: () => void
  volume: number
  onVolumeChange: (v: number) => void
}

export default function TVControls({
  overlay,
  onToggleOverlay,
  onFullscreen,
  volume,
  onVolumeChange,
}: TVControlsProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => onToggleOverlay(overlay === 'show-info' ? 'none' : 'show-info')}
        className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide border transition-colors ${
          overlay === 'show-info'
            ? 'bg-ralph-pink text-white border-ralph-pink'
            : 'bg-black/50 text-white border-white/20 hover:border-ralph-pink'
        }`}
      >
        Show Info
      </button>
      <button
        onClick={() => onToggleOverlay(overlay === 'schedule' ? 'none' : 'schedule')}
        className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide border transition-colors ${
          overlay === 'schedule'
            ? 'bg-ralph-teal text-white border-ralph-teal'
            : 'bg-black/50 text-white border-white/20 hover:border-ralph-teal'
        }`}
      >
        Schedule
      </button>
      <button
        onClick={onFullscreen}
        className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide border bg-black/50 text-white border-white/20 hover:border-ralph-yellow transition-colors"
      >
        Fullscreen
      </button>

      {/* Volume slider */}
      <div className="flex flex-col items-center gap-2 mt-2 py-3 border border-white/20 rounded-md bg-black/50">
        <span className="text-[10px] text-white/60 uppercase tracking-wide">Vol</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-20 accent-ralph-pink"
          style={{ writingMode: 'vertical-lr' as const }}
        />
      </div>
    </div>
  )
}
