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
  /** Controlled mute. When provided, LivePlayer's mute is driven by the parent
      (used by the mobile immersive view's own mute button). Omit for the
      original self-managed behaviour (homepage teaser, desktop set). */
  muted?: boolean
  onMutedChange?: (m: boolean) => void
  /** Video object-fit. Default 'cover' (fills the TV cutout); 'contain' for the
      full-bleed immersive overlay so nothing is cropped. */
  fit?: 'cover' | 'contain'
  /** Hide the built-in hover-mute button + "tap to unmute" pill (the immersive
      view supplies its own control). */
  hideMuteUi?: boolean
}

export default function LivePlayer({
  relayUrl,
  className = '',
  onLiveChange,
  volume,
  onVolumeChange,
  offlineLabel = 'OFFLINE',
  offlineMessage = 'Tune in later',
  muted: mutedProp,
  onMutedChange,
  fit = 'cover',
  hideMuteUi = false,
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
  // Muted starts true because browsers block unmuted autoplay. The
  // Tap-to-unmute pill flips this on first user interaction. When the parent
  // controls mute (mutedProp), that wins over the internal flag.
  const [internalMuted, setInternalMuted] = useState(true)
  const isMuted = mutedProp ?? internalMuted

  // Apply volume when it changes
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
  }, [volume, videoRef])

  // Keep the element's muted flag in sync with the (possibly controlled) state —
  // covers external toggles (e.g. the immersive mute button) as well as clicks.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const shouldMute = isMuted || volume === 0
    v.muted = shouldMute
    if (!shouldMute && v.paused) {
      v.play().catch(() => {
        /* browser-blocked unmuted resume — needs another gesture */
      })
    }
  }, [isMuted, volume, videoRef])

  // Ralph TV behaves like a real TV — it doesn't pause. If the browser
  // pauses the video (tab hidden then visible, fullscreen change,
  // media-session key press, HLS stall recovery), resume immediately.
  // In muted state autoplay is always allowed; unmuted resumption also
  // works because the user has interacted at least once by that point.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPause = () => {
      if (v.ended) return
      v.play().catch(() => {
        /* browser-blocked resume — nothing we can do without another user gesture */
      })
    }
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('pause', onPause)
    }
  }, [videoRef])

  useEffect(() => {
    onLiveChange?.(isReady && !error)
  }, [isReady, error, onLiveChange])

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    const next = !isMuted
    // Set the element flag directly inside the gesture (iOS unmute needs this),
    // then update state (controlled → parent, else internal). The sync effect
    // also handles later external changes.
    v.muted = next || volume === 0
    if (!next && v.paused) {
      v.play().catch(() => {
        /* nothing to do — video will retry on next auto-resume */
      })
    }
    if (onMutedChange) onMutedChange(next)
    else setInternalMuted(next)
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
        className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
        playsInline
        muted={isMuted || volume === 0}
        autoPlay
      />

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
          <div className="text-white/50 text-xs tracking-widest">
            TUNING IN...
          </div>
        </div>
      )}

      {/* Click-through overlay — hover to show a mute/unmute icon.
          Click toggles mute only; the stream never pauses (TV-style
          continuous playback). Suppressed when the parent supplies its own
          mute control (immersive view). */}
      {isReady && !hideMuteUi && (
        <button
          onClick={toggleMute}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <div className="text-white text-4xl drop-shadow-lg">
            {isMuted ? '🔇' : '🔊'}
          </div>
        </button>
      )}

      {/* Persistent unmute pill until user interacts */}
      {isReady && isMuted && !hideMuteUi && (
        <button
          onClick={toggleMute}
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
