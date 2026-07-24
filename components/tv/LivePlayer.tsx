'use client'

import { useEffect, useState } from 'react'
import { useHls } from '@/hooks/useHls'
import { useRelayUrl } from '@/hooks/useRelayUrl'

interface LivePlayerProps {
  relayUrl?: string
  className?: string
  onLiveChange?: (isLive: boolean) => void
  volume: number
  onVolumeChange: (v: number) => void
  offlineLabel?: string
  offlineMessage?: string
}

export default function LivePlayer({
  relayUrl,
  className = '',
  onLiveChange,
  volume,
  onVolumeChange,
  offlineLabel = 'OFFLINE',
  offlineMessage = 'Tune in later',
}: LivePlayerProps) {
  // Prop wins (used by tests / homepage teaser overrides). Otherwise pull
  // the URL at runtime from /api/broadcaster/relay-url — reading
  // process.env.NEXT_PUBLIC_… here would bake whatever value was set at
  // BUILD time into the client bundle, which silently vanished on any
  // Railway rebuild that didn't have the var set. Runtime fetch means
  // env changes take effect without a rebuild and null returns are
  // observable via network log rather than silent-black.
  const runtimeRelayUrl = useRelayUrl()
  const streamUrl = relayUrl ?? runtimeRelayUrl
  const { videoRef, isReady, error } = useHls(streamUrl)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMutedForAutoplay, setIsMutedForAutoplay] = useState(true)

  // Apply volume when it changes
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
  }, [volume, videoRef])

  // Sync isPlaying with real video element events (not our local guess)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [videoRef])

  useEffect(() => {
    onLiveChange?.(isReady && !error)
  }, [isReady, error, onLiveChange])

  async function handleClick() {
    const v = videoRef.current
    if (!v) return
    // First click unmutes (in case autoplay started muted)
    if (isMutedForAutoplay) {
      v.muted = false
      setIsMutedForAutoplay(false)
    }
    try {
      if (v.paused) {
        await v.play()
      } else {
        v.pause()
      }
    } catch {
      // Play blocked — leave state as-is
    }
  }

  // No stream URL or error: offline fallback
  if (!streamUrl || error) {
    return (
      <div
        className={`w-full h-full bg-black flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="text-ralph-pink text-sm mb-2 tracking-widest">
            {offlineLabel}
          </div>
          <p className="text-white/40 text-xs">{offlineMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full bg-black relative ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted={isMutedForAutoplay || volume === 0}
        autoPlay
      />

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
          <div className="text-white/50 text-xs tracking-widest">
            TUNING IN...
          </div>
        </div>
      )}

      {/* Click-through overlay */}
      {isReady && (
        <button
          onClick={handleClick}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div className="text-white text-4xl drop-shadow-lg">
            {isPlaying ? '❚❚' : '▶'}
          </div>
        </button>
      )}

      {/* Persistent unmute pill until user interacts */}
      {isReady && isMutedForAutoplay && (
        <button
          onClick={handleClick}
          className="absolute bottom-3 right-3 bg-black/70 border border-white/20 text-white text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur hover:bg-black/90 transition-colors"
        >
          🔇 Tap to unmute
        </button>
      )}

      <input
        type="hidden"
        value={volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
      />
    </div>
  )
}
