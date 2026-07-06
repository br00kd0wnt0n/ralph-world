'use client'

import { useHls } from '@/hooks/useHls'

/**
 * Compact live-feed preview for the homepage TV panel.
 *
 * Mirrors the LivePlayer's HLS hookup but strips everything interactive:
 * no controls, no play/pause overlay, no unmute pill, no audio ever.
 * The video is purely decorative — the "Watch now" CTA next to it takes
 * the user to /tv where the full player lives.
 *
 * Falls back to a static "Ralph TV" placeholder tile when the stream URL
 * isn't configured or the feed can't reach ready state, so the homepage
 * doesn't render a broken video element in dev / when broadcaster is down.
 */
interface HomepageTvTeaserProps {
  /** Optional override — defaults to NEXT_PUBLIC_BROADCASTER_RELAY_URL. */
  relayUrl?: string
  className?: string
}

export default function HomepageTvTeaser({
  relayUrl,
  className = '',
}: HomepageTvTeaserProps) {
  const streamUrl =
    relayUrl ?? process.env.NEXT_PUBLIC_BROADCASTER_RELAY_URL ?? null
  const { videoRef, isReady, error } = useHls(streamUrl)

  if (!streamUrl || error) {
    return (
      <div
        className={`w-full h-full bg-black flex items-center justify-center ${className}`}
        aria-hidden="true"
      >
        <div className="text-center">
          <div className="text-ralph-pink text-xs mb-1 tracking-widest">
            RALPH TV
          </div>
          <p className="text-white/40 text-[10px]">Tune in on /tv</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full bg-black relative ${className}`}>
      <video
        ref={videoRef}
        // Muted permanently — no audio interaction on the homepage teaser.
        muted
        // playsInline required for iOS Safari autoplay.
        playsInline
        autoPlay
        // No controls, no context menu — video is passive decoration.
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        // pointer-events: none lets clicks flow through to the parent
        // container / CTA link.
        className="w-full h-full object-cover pointer-events-none"
        aria-hidden="true"
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none">
          <div className="text-white/50 text-[10px] tracking-widest">
            TUNING IN...
          </div>
        </div>
      )}
    </div>
  )
}
