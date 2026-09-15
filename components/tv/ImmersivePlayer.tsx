'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as Sentry from '@sentry/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { screenStateVariants } from '@/lib/animation/tv'
import ShadowCloseButton from '@/components/ui/ShadowCloseButton'
import LivePlayer from './LivePlayer'
import TeletextShowInfo from './TeletextShowInfo'
import TeletextSchedule from './TeletextSchedule'
import { useContentAspect } from '@/hooks/useContentAspect'
import type { ContentAspect, ScheduleItem } from '@/lib/broadcaster/types'
import type { TVOverlayState } from './TVSet'

function breadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({ category: 'tv-immersive', message, level: 'debug', data })
}

interface ImmersivePlayerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  volume: number
  onVolumeChange: (v: number) => void
  offlineLabel?: string
  offlineMessage?: string
  /** No element-fullscreen API (iPhone Safari) — this view relies on Apple's
      native <video> fullscreen instead. */
  isIphone: boolean
  /** Mute state to start with: unmuted on iPhone (the tap is a valid audio
      gesture for the native player), muted on Android/desktop (autoplay
      requires it — the user unmutes via the overlay button). */
  initialMuted: boolean
  isPortrait: boolean
  overlay: TVOverlayState
  setOverlay: (s: TVOverlayState) => void
  currentShow?: ScheduleItem
  schedule: ScheduleItem[]
  scheduleCurrentIndex: number
  /** 'letterbox' (default) plays the picture full-bleed with a small
      dismissible landscape hint; 'wall' restores the old full-block prompt. */
  portraitBehavior: 'letterbox' | 'wall'
  /** Source orientation of the clip on air (from /now-playing). The broadcaster
      pads portrait clips into its 16:9 stream, so on a portrait phone we zoom to
      the strip instead of showing a small picture with black on every side.
      null = not probed yet → pixel detection fallback (useContentAspect). */
  contentAspect: ContentAspect | null
  /** Source dimensions, when known — gives the exact strip width to zoom to. */
  contentDims: { width: number; height: number } | null
  onExit: () => void
}

export default function ImmersivePlayer({
  containerRef,
  volume,
  onVolumeChange,
  offlineLabel,
  offlineMessage,
  isIphone,
  initialMuted,
  isPortrait,
  overlay,
  setOverlay,
  currentShow,
  schedule,
  scheduleCurrentIndex,
  portraitBehavior,
  contentAspect,
  contentDims,
  onExit,
}: ImmersivePlayerProps) {
  const [immersiveMuted, setImmersiveMuted] = useState(initialMuted)
  const [immersiveVideoReady, setImmersiveVideoReady] = useState(false)
  // The <video> as state too (the ref alone can't drive hooks/effects).
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  // Decoded frame size — the stream is 16:9 today, but read it rather than assume.
  const [frameDims, setFrameDims] = useState<{ width: number; height: number } | null>(null)
  // Metadata wins; the pixel detector only runs while we don't have it.
  const detectedAspect = useContentAspect(videoEl, contentAspect == null)
  const effectiveAspect: ContentAspect | null = contentAspect ?? detectedAspect
  const portraitContent = effectiveAspect === 'portrait'
  // Portrait clips keep our CSS overlay even on iPhone: Apple's native player can't
  // be styled, so it would show the padded 16:9 frame with the strip in the middle,
  // while the overlay can zoom to it. Decided once at mount so we never yank the
  // viewer between players mid-watch.
  const keepCssOverlayRef = useRef(contentAspect === 'portrait')
  // Stable identity: LivePlayer re-runs its "surface the <video>" effect whenever
  // this prop changes, and an inline closure changes on every parent render (TVSet
  // re-renders on each schedule/now-playing poll). That flapped the element
  // null → el each time, which restarted the orientation sampler before it could
  // ever reach three consecutive readings.
  const handleVideoEl = useCallback((el: HTMLVideoElement | null) => {
    immersiveVideoRef.current = el
    setVideoEl(el)
    setImmersiveVideoReady(Boolean(el))
  }, [])
  // True once Apple's native fullscreen has actually opened. While false —
  // never attempted, unsupported, or it threw — our CSS overlay is what the
  // user sees, so it must keep its own controls (Schedule/Info/rotate hint)
  // rather than deferring to a native UI that never appeared.
  const [iosFsOpen, setIosFsOpen] = useState(false)
  const [portraitHintDismissed, setPortraitHintDismissed] = useState(false)
  const immersiveVideoRef = useRef<HTMLVideoElement | null>(null)
  const iosFsDoneRef = useRef(false)
  // TVSet re-renders often (schedule/now-playing polls) and passes a new
  // `onExit` closure each time. Read the latest value through a ref rather
  // than depending on the prop directly, so the one-shot effect below
  // doesn't re-run (and, guarded by iosFsDoneRef, fail to re-arm its
  // webkitendfullscreen listener) every time the parent re-renders.
  const onExitRef = useRef(onExit)
  useEffect(() => {
    onExitRef.current = onExit
  }, [onExit])

  // Orientation the immersive view wants right now; re-applied whenever the clip
  // on air changes shape while element fullscreen is active.
  const desiredOrientationRef = useRef<'landscape' | 'portrait'>(portraitContent ? 'portrait' : 'landscape')
  const lockOrientationRef = useRef<() => void>(() => {})
  useEffect(() => {
    desiredOrientationRef.current = portraitContent ? 'portrait' : 'landscape'
    if (document.fullscreenElement) lockOrientationRef.current()
  }, [portraitContent])

  // Track the decoded frame size (known only after metadata loads / on `resize`).
  useEffect(() => {
    if (!videoEl) return
    const v = videoEl
    const read = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) setFrameDims({ width: v.videoWidth, height: v.videoHeight })
    }
    read()
    v.addEventListener('loadedmetadata', read)
    v.addEventListener('resize', read)
    return () => {
      v.removeEventListener('loadedmetadata', read)
      v.removeEventListener('resize', read)
    }
  }, [videoEl])

  // Scroll lock + best-effort landscape lock + Android back/swipe detection.
  // Runs for the lifetime of this component (mounted only while immersive).
  useEffect(() => {
    const html = document.documentElement
    const prevHtml = html.style.overflow
    const prevBody = document.body.style.overflow
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    const orientation = (
      screen as unknown as { orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void } }
    ).orientation
    // orientation.lock() only succeeds once element fullscreen is actually
    // active — calling it eagerly (before requestFullscreen resolves) always
    // rejects on Android. Wait for fullscreenchange to confirm entry, and
    // check once up front in case it's already active. The target orientation
    // follows the content (see desiredOrientationRef): landscape for the normal
    // 16:9 shows, portrait for a vertical clip.
    const tryLock = () => {
      orientation?.lock?.(desiredOrientationRef.current).catch((err) => {
        breadcrumb('orientation.lock rejected', { message: String(err) })
      })
    }
    lockOrientationRef.current = tryLock
    if (document.fullscreenElement) tryLock()
    const onFsChange = () => {
      if (document.fullscreenElement) {
        tryLock()
      } else {
        // Android back gesture / swipe-down exits fullscreen without going
        // through our Exit button.
        onExitRef.current()
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      html.style.overflow = prevHtml
      document.body.style.overflow = prevBody
      orientation?.unlock?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On iPhone, webkitEnterFullscreen() usually fires within a beat of the
  // video's metadata loading — often too fast for anyone to tap Schedule/
  // Info/Mute before Apple's native player takes the screen. Showing
  // controls that vanish before they can be used is worse than showing
  // nothing, so hold them back until either native fullscreen is confirmed
  // NOT to be happening quickly (this timer) or it opens (which hides them
  // anyway via nativePlayerActive below).
  const [iosFallbackReady, setIosFallbackReady] = useState(!isIphone)
  useEffect(() => {
    if (!isIphone) return
    const timer = setTimeout(() => setIosFallbackReady(true), 1500)
    return () => clearTimeout(timer)
  }, [isIphone])

  // Drive the iPhone native <video> fullscreen. Runs once the video is
  // mounted so it can still fire in-gesture if the stream resolves late.
  useEffect(() => {
    if (!isIphone || !immersiveVideoReady) return
    if (iosFsDoneRef.current || keepCssOverlayRef.current) return
    const v = immersiveVideoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null
    if (!v?.webkitEnterFullscreen) return
    iosFsDoneRef.current = true
    const go = () => {
      try {
        v.webkitEnterFullscreen!()
        setIosFsOpen(true)
      } catch (err) {
        breadcrumb('webkitEnterFullscreen failed', { message: String(err) })
        /* not ready / unsupported — the CSS overlay remains as a fallback */
      }
    }
    if (v.readyState >= 1) go()
    else v.addEventListener('loadedmetadata', go, { once: true })
    const onEnd = () => {
      setIosFsOpen(false)
      onExitRef.current()
    }
    v.addEventListener('webkitendfullscreen', onEnd, { once: true })
    return () => {
      v.removeEventListener('loadedmetadata', go)
      v.removeEventListener('webkitendfullscreen', onEnd)
    }
    // onExit intentionally excluded — see onExitRef above. Including it here
    // re-triggers this effect on every parent re-render, and iosFsDoneRef's
    // guard means the re-run bails out without re-arming the listener.
  }, [isIphone, immersiveVideoReady])

  // Hide Schedule/Info + the rotate hint once Apple's native player has
  // actually taken over — and, on iPhone, also hold them back until we're
  // past the iosFallbackReady grace period (see above) so they're never
  // shown just to be yanked away a moment later.
  const nativePlayerActive = isIphone && iosFsOpen
  const showFallbackControls = !nativePlayerActive && iosFallbackReady
  // The rotate hint fires when the phone is held the "wrong" way for the clip:
  // landscape shows want landscape, a vertical clip wants portrait.
  const orientationMismatch = portraitContent ? !isPortrait : isPortrait
  const showPortraitHint = showFallbackControls && orientationMismatch
  const hintText = portraitContent
    ? 'This show is best in portrait — rotate your device'
    : 'Ralph TV is best in landscape — rotate your device'

  // Zoom to the strip. The stream frame is 16:9 with the portrait clip centred
  // between black pillars; contain-fitting it on a portrait phone leaves a small
  // picture with black on every side. Scaling the contain-fitted frame by
  // frameAspect / stripAspect makes the strip exactly fill the width (a 9:16 clip
  // in a 16:9 frame: (16/9) / (9/16) = 3.16), and overflow clips the pillars away.
  // Only in portrait orientation — in landscape the strip is pillarboxed by nature
  // — and never while Apple's native player owns the screen (we can't style it).
  const frameAspect = frameDims ? frameDims.width / frameDims.height : 16 / 9
  const stripAspect =
    contentDims && contentDims.width > 0 && contentDims.height > 0
      ? contentDims.width / contentDims.height
      : 9 / 16
  const zoomToStrip = portraitContent && isPortrait && !nativePlayerActive
  const zoomScale = zoomToStrip ? Math.max(1, frameAspect / stripAspect) : 1

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black"
      style={{ width: '100dvw', height: '100dvh' }}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        data-testid="immersive-stage"
        data-zoom={zoomScale.toFixed(2)}
        data-aspect={effectiveAspect ?? 'unknown'}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
            transformOrigin: 'center center',
            transition: 'transform 300ms ease-out',
          }}
        >
        <LivePlayer
          volume={volume}
          onVolumeChange={onVolumeChange}
          muted={immersiveMuted}
          onMutedChange={setImmersiveMuted}
          fit="contain"
          hideMuteUi
          onVideoEl={handleVideoEl}
          offlineLabel={offlineLabel}
          offlineMessage={offlineMessage}
        />
        </div>
      </div>

      {/* Schedule / Show Info overlays over the immersive video */}
      <AnimatePresence>
        {overlay === 'show-info' && (
          <motion.div
            key="im-show-info"
            variants={screenStateVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 z-10"
          >
            <TeletextShowInfo current={currentShow} />
          </motion.div>
        )}
        {overlay === 'schedule' && (
          <motion.div
            key="im-schedule"
            variants={screenStateVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 z-10"
          >
            <TeletextSchedule schedule={schedule} currentIndex={scheduleCurrentIndex} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit — top-right, shared shadow-press close button */}
      <div className="absolute top-4 right-4 z-30">
        <ShadowCloseButton onClick={onExit} ariaLabel="Exit full screen" />
      </div>

      {/* Schedule / Show Info / Mute — bottom-right. Simple white blocks
          with black text/icons; toggled-open state inverts to black. Hidden
          once Apple's native player owns the screen (they can't overlay it),
          and on iPhone also held back during the pre-native-fullscreen grace
          period — see showFallbackControls above. */}
      {showFallbackControls && (
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOverlay(overlay === 'schedule' ? 'none' : 'schedule')}
            aria-pressed={overlay === 'schedule'}
            className={`px-4 text-sm font-semibold transition active:scale-95 ${
              overlay === 'schedule' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
            style={{ height: 44 }}
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={() => setOverlay(overlay === 'show-info' ? 'none' : 'show-info')}
            aria-pressed={overlay === 'show-info'}
            className={`px-4 text-sm font-semibold transition active:scale-95 ${
              overlay === 'show-info' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
            style={{ height: 44 }}
          >
            Info
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !immersiveMuted
              // Flip the element's flag synchronously inside the click gesture
              // (needed for iOS-style unmute rules) — the sync effect in
              // LivePlayer also picks up the state change for any later drift.
              const v = immersiveVideoRef.current
              if (v) {
                v.muted = next || volume === 0
                if (!next && v.paused) v.play().catch(() => {})
              }
              setImmersiveMuted(next)
            }}
            aria-label={immersiveMuted ? 'Unmute' : 'Mute'}
            className="flex items-center justify-center bg-white text-black transition active:scale-95"
            style={{ width: 44, height: 44 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5z" fill="black" />
              {immersiveMuted ? (
                <path d="M16 9l5 6M21 9l-5 6" stroke="black" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" stroke="black" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      )}

      {/* Portrait: 'wall' covers the picture entirely (old behaviour, video
          keeps playing behind so audio continues); 'letterbox' (default)
          leaves the picture visible and only shows a small dismissible hint.
          Both are skipped once Apple's native player owns rotation itself. */}
      {showPortraitHint && portraitBehavior === 'wall' && (
        <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center gap-4 px-8 text-center text-white">
          <div className="text-5xl" aria-hidden>
            ↻
          </div>
          <p
            style={{
              fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
              fontWeight: 600,
              fontSize: 26,
              lineHeight: 1.1,
            }}
          >
            Rotate your device
          </p>
          <p
            className="text-white"
            style={{
              fontFamily: 'var(--font-body), Roboto, sans-serif',
              fontWeight: 600,
              fontSize: 15,
              lineHeight: 1.4,
            }}
          >
            {portraitContent ? 'This show is best in portrait' : 'Ralph TV is best in landscape'}
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-2 text-white hover:opacity-60 active:opacity-60 transition-opacity"
            style={{
              fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
              fontWeight: 600,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            &lt; Exit
          </button>
        </div>
      )}

      {showPortraitHint && portraitBehavior === 'letterbox' && !portraitHintDismissed && (
        <div className="absolute top-4 left-4 right-16 z-30 flex items-center gap-2 bg-black/70 border border-white/15 text-white px-3 py-2 backdrop-blur">
          <span className="text-lg" aria-hidden>
            ↻
          </span>
          <p className="text-xs font-semibold leading-tight flex-1">{hintText}</p>
          <button
            type="button"
            onClick={() => setPortraitHintDismissed(true)}
            aria-label="Dismiss landscape hint"
            className="text-white/70 hover:text-white text-sm leading-none px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
