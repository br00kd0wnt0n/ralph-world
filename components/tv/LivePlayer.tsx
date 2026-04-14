'use client'

import { useEffect, useState } from 'react'
import { useHls } from '@/hooks/useHls'

interface LivePlayerProps {
  relayUrl?: string
  className?: string
  onLiveChange?: (isLive: boolean) => void
  volume: number
  onVolumeChange: (v: number) => void
}

export default function LivePlayer({
  relayUrl,
  className = '',
  onLiveChange,
  volume,
  onVolumeChange,
}: LivePlayerProps) {
  const streamUrl = relayUrl ?? process.env.NEXT_PUBLIC_BROADCASTER_RELAY_URL ?? null
  const { videoRef, isReady, error } = useHls(streamUrl)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
    }
  }, [volume, videoRef])

  useEffect(() => {
    onLiveChange?.(isReady && !error)
  }, [isReady, error, onLiveChange])

  async function handlePlay() {
    const v = videoRef.current
    if (!v) return
    try {
      if (isPlaying) {
        v.pause()
        setIsPlaying(false)
      } else {
        await v.play()
        setIsPlaying(true)
      }
    } catch {
      // Autoplay blocked — user must interact
    }
  }

  // No stream URL or error: show offline fallback
  if (!streamUrl || error) {
    return (
      <div className={`w-full h-full bg-black flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-ralph-pink text-sm mb-2 tracking-widest">OFFLINE</div>
          <p className="text-white/40 text-xs">Tune in later</p>
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
        muted={volume === 0}
        autoPlay
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white/50 text-xs tracking-widest">TUNING IN...</div>
        </div>
      )}
      {isReady && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div className="text-white text-4xl">{isPlaying ? '❚❚' : '▶'}</div>
        </button>
      )}
      <input type="hidden" value={volume} onChange={(e) => onVolumeChange(Number(e.target.value))} />
    </div>
  )
}
