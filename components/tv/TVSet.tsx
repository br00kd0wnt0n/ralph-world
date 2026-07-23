'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveStatus } from '@/hooks/useLiveStatus'
import { useAuth } from '@/context/AuthContext'
import { screenStateVariants } from '@/lib/animation/tv'
import LivePlayer from './LivePlayer'
import TeletextShowInfo from './TeletextShowInfo'
import TeletextSchedule from './TeletextSchedule'
import SubscribeGate from './SubscribeGate'
import type { ScheduleItem } from '@/lib/broadcaster/types'
import { safeGet, safeSet } from '@/lib/safe-storage'

export type TVOverlayState = 'none' | 'show-info' | 'schedule'

interface TVSetProps {
  onSubscribe: () => void
  offlineLabel?: string
  offlineMessage?: string
  subscribeHeading?: string
  subscribeBody?: string
  /** Whether the freeview timer is active. false = unrestricted for all guests. */
  previewEnabled?: boolean
  /** Seconds a guest may watch before the gate appears. Omit or 0 = gate immediately. */
  previewSeconds?: number
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TVSet({
  onSubscribe,
  offlineLabel = 'OFFLINE',
  offlineMessage = 'Tune in later',
  subscribeHeading,
  subscribeBody,
  previewEnabled = true,
  previewSeconds = 600,
}: TVSetProps) {
  const { user } = useAuth()
  const { isLive } = useLiveStatus()
  const [overlay, setOverlay] = useState<TVOverlayState>('none')
  const [previewExpired, setPreviewExpired] = useState(false)
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState(previewSeconds)
  const [volume, setVolume] = useState(0.7)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  // Authoritative now-playing (what the streamer is ACTUALLY playing). Preferred over
  // the time-based schedule pointer for the "On now / Up next" readout so it matches
  // the live stream.
  const [nowPlaying, setNowPlaying] = useState<{ current: ScheduleItem | null; next: ScheduleItem | null }>({ current: null, next: null })
  const containerRef = useRef<HTMLDivElement>(null)
  const volumeMeterRef = useRef<HTMLDivElement>(null)
  const isDraggingVolume = useRef(false)
  const sfxOn = useRef<HTMLAudioElement | null>(null)
  const sfxOff = useRef<HTMLAudioElement | null>(null)

  // Preload the button SFX so the first click isn't delayed by a network fetch.
  useEffect(() => {
    sfxOn.current = new Audio('/sfx/tv_button_on.m4a')
    sfxOff.current = new Audio('/sfx/tv_button_off.m4a')
  }, [])

  // Track fullscreen state so the Fullscreen button can stay 'on' while active.
  // The native fullscreen API can change state outside our click handler (Esc
  // key, browser UI, OS), so we listen to fullscreenchange rather than only
  // toggling on click.
  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function playSfx(state: 'on' | 'off') {
    const audio = state === 'on' ? sfxOn.current : sfxOff.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  useEffect(() => {
    const stored = safeGet('ralph-tv-volume')
    if (stored) {
      const n = Number(stored)
      if (Number.isFinite(n) && n >= 0 && n <= 1) setVolume(n)
    }
  }, [])

  useEffect(() => {
    safeSet('ralph-tv-volume', String(volume))
  }, [volume])

  // Guest countdown preview — starts once the stream goes live.
  // A ref prevents the timer restarting if isLive flickers.
  // Uses setInterval (not setTimeout) so we can track seconds remaining for the
  // on-screen countdown badge. When previewEnabled is false the timer never runs.
  //
  // PERSISTENCE: writes the expiry timestamp to localStorage so a page refresh
  // (or a new tab) cannot reset the countdown. The stored value survives
  // until the user signs in or clears site data.
  //   ralph-tv-preview-expires-at = epoch ms when the gate should activate
  const PREVIEW_KEY = 'ralph-tv-preview-expires-at'
  const timerStartedRef = useRef(false)
  const isGuest = !user

  useEffect(() => {
    // Anyone signed in clears the stored expiry — no need to penalise a
    // returning guest who upgraded mid-session.
    if (!isGuest) {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(PREVIEW_KEY)
      } catch {
        /* private mode etc — ignore */
      }
      return
    }
    if (!previewEnabled || !isLive || timerStartedRef.current) return
    timerStartedRef.current = true

    if (previewSeconds <= 0) {
      setPreviewExpired(true)
      setPreviewSecondsLeft(0)
      return
    }

    // Resolve expiry timestamp:
    //   - if a valid future timestamp exists in storage, RESUME from it
    //   - if a past timestamp exists, the gate already fired — flip now
    //   - otherwise, this is the first watch session — write a fresh one
    let expiresAt = 0
    try {
      const stored = safeGet(PREVIEW_KEY)
      if (stored) {
        const n = Number(stored)
        if (Number.isFinite(n) && n > 0) expiresAt = n
      }
    } catch {
      /* ignore */
    }
    const now = Date.now()
    if (!expiresAt) {
      expiresAt = now + previewSeconds * 1_000
      safeSet(PREVIEW_KEY, String(expiresAt))
    }

    if (expiresAt <= now) {
      // Refresh after countdown already expired — stay gated.
      setPreviewExpired(true)
      setPreviewSecondsLeft(0)
      return
    }

    const initialSecondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1_000))
    setPreviewSecondsLeft(initialSecondsLeft)

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1_000))
      setPreviewSecondsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        setPreviewExpired(true)
      }
    }, 1_000)

    return () => clearInterval(interval)
  }, [isLive, isGuest, previewEnabled, previewSeconds])

  // Poll schedule continuously — Show Info, Schedule overlay, and the
  // "On now / Up next" status bar all read from this single state. The
  // broadcaster pointer advances in real time, so a one-shot fetch goes
  // stale fast (one show ends, the overlay keeps showing the old one).
  useEffect(() => {
    let mounted = true

    async function fetchSchedule() {
      try {
        // Timestamp query param defeats any intermediate cache (browser,
        // proxy, Railway edge) regardless of Cache-Control headers.
        const res = await fetch(`/api/broadcaster/schedule?t=${Date.now()}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (mounted) setSchedule(Array.isArray(data) ? data : [])
      } catch {
        if (mounted) setSchedule([])
      }
    }

    fetchSchedule()
    const interval = setInterval(fetchSchedule, 30_000)

    // Refetch immediately when the tab becomes visible — otherwise a user
    // who switches tabs for a minute comes back to the show that was on
    // when they left, even though the pointer has moved.
    function onVisible() {
      if (document.visibilityState === 'visible') fetchSchedule()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      mounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Poll the authoritative now-playing (streamer's real current clip). Faster than the
  // schedule poll because clips can be short and this must track the live stream.
  useEffect(() => {
    let mounted = true
    async function fetchNowPlaying() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        const res = await fetch(`/api/broadcaster/now-playing?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setNowPlaying({ current: data?.current ?? null, next: data?.next ?? null })
      } catch {
        /* keep last known — the schedule fallback covers gaps */
      }
    }
    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 10_000)
    function onVisible() {
      if (document.visibilityState === 'visible') fetchNowPlaying()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function handleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen?.()
    }
  }

  function updateVolumeFromPointer(clientY: number) {
    const rect = volumeMeterRef.current?.getBoundingClientRect()
    if (!rect) return
    const y = clientY - rect.top
    const next = 1 - y / rect.height
    setVolume(Math.max(0, Math.min(1, next)))
  }

  // Prefer the authoritative now-playing; fall back to the schedule pointer only if
  // the streamer status is unavailable.
  const currentShow = nowPlaying.current ?? schedule[0]
  const nextShow = nowPlaying.next ?? schedule[1]

  // Determine screen state.
  // When previewEnabled is false, guests watch freely with no expiry.
  // When previewEnabled is true, guests are gated once previewExpired flips.
  const gateActive = previewEnabled && isGuest && previewExpired
  let screenState: 'live' | 'subscribe-gate' | 'offline' = 'offline'
  if (isLive && !gateActive) {
    screenState = 'live'
  } else if (isLive && gateActive) {
    screenState = 'subscribe-gate'
  }

  return (
    <div className="flex flex-col items-center gap-4 max-w-5xl mx-auto">
      {/* TV SET — graphic from public/imgs with the live screen positioned over its cutout */}
      <div ref={containerRef} className="relative w-full">
        <div
          className="relative w-full mx-auto"
          style={{ aspectRatio: '976.297 / 676.934' }}
        >
          {/* Ground — sits behind the TV, centered, slightly wider than the chrome
              so it extends past the TV's left/right edges (ground SVG viewBox is
              1198.409 wide vs 976.297 for the TV, hence ~122.7%). */}
          <img
            src="/imgs/tv_set_ground.svg"
            alt=""
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none"
            style={{ bottom: '-5.5%', width: '124%', maxWidth: 'none' }}
          />

          {/* Screen — sits behind the SVG; the SVG's screen cutout reveals it */}
          <div
            className="absolute bg-black overflow-hidden"
            style={{
              // Bounds derived from the screen cutout in tv_set_cropped.svg
              // (viewBox 976.297 × 676.934). Pin to the cutout so the video
              // lines up exactly with the painted bezel.
              left: '9.3%',
              top: '14.0%',
              width: '63.9%',
              height: '69.6%',
            }}
          >
            {/* LivePlayer stays mounted whenever we have a live stream, so */}
            {/* HLS isn't torn down when overlays open or status blips */}
            {screenState === 'live' && (
              <div className="absolute inset-0">
                <LivePlayer
                  volume={volume}
                  onVolumeChange={setVolume}
                  offlineLabel={offlineLabel}
                  offlineMessage={offlineMessage}
                />
              </div>
            )}

            {/* Subscribe gate also stays mounted when active */}
            {screenState === 'subscribe-gate' && (
              <div className="absolute inset-0">
                <SubscribeGate
                  onSubscribe={onSubscribe}
                  heading={subscribeHeading}
                  body={subscribeBody}
                />
              </div>
            )}

            {/* Offline fallback */}
            {screenState === 'offline' && (
              <div className="absolute inset-0 bg-black">
                {/* SMPTE test-card GIF fills the screen */}
                <img
                  src="/offline.gif"
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark scrim so the OFFLINE label stays readable */}
                <div className="absolute inset-0 bg-black/55" />
                <div className="relative z-10 h-full flex items-center justify-center">
                  <div className="text-center">
                    <div
                      className="text-ralph-pink text-2xl md:text-3xl mb-2 tracking-widest font-mono font-bold"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                    >
                      {offlineLabel}
                    </div>
                    <p
                      className="text-white text-xs md:text-sm"
                      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                    >
                      {offlineMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Freeview countdown badge — top-left, guests only, pre-expiry.
                Visible badge is aria-hidden (its per-second text would otherwise
                spam SR users); a sibling live region announces at milestones. */}
            {previewEnabled && isGuest && isLive && !previewExpired && (
              <>
                <div
                  className="absolute top-2 left-2 z-20 pointer-events-none select-none"
                  aria-hidden="true"
                >
                  <div className="bg-black/75 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-white/10">
                    <p className="text-white font-mono font-bold leading-none" style={{ fontSize: '0.65em' }}>
                      Free view ends in{' '}
                      <span className={previewSecondsLeft <= 60 ? 'text-ralph-pink' : 'text-white'}>
                        {formatCountdown(previewSecondsLeft)}
                      </span>
                    </p>
                    <p className="text-white/60 mt-0.5 leading-none" style={{ fontSize: '0.55em' }}>
                      Subscribe to unlock →
                    </p>
                  </div>
                </div>
                {/* Coarse announcements only (1 min / 30s / 10s left). */}
                <div className="sr-only" role="status" aria-live="polite">
                  {previewSecondsLeft === 60
                    ? 'One minute of free viewing left'
                    : previewSecondsLeft === 30
                      ? '30 seconds of free viewing left'
                      : previewSecondsLeft === 10
                        ? '10 seconds of free viewing left'
                        : ''}
                </div>
              </>
            )}

            {/* Overlays render ON TOP of the player — don't replace it */}
            <AnimatePresence>
              {overlay === 'show-info' && (
                <motion.div
                  key="show-info"
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
                  key="schedule"
                  variants={screenStateVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute inset-0 z-10"
                >
                  <TeletextSchedule schedule={schedule} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* TV chrome — the SVG sits on top so its painted bezel frames the screen.
              pointer-events disabled so overlay/screen interactions still pass through. */}
          <img
            src="/imgs/tv_set_cropped.svg"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
          />

          {/* TV side panel — sits inside the TV's right-hand decorative area
              (the speaker/control zone between ~73% and ~99% of the TV width).
              Panel SVG viewBox is 169 × 380; rendered at ~17.3% of TV width
              to match the TV's natural scale. Buttons overlay on top of it. */}
          <div
            className="absolute [container-type:inline-size]"
            style={{
              right: '2%',
              top: '5.4%',
              width: '17.3%',
            }}
          >
            <div className="relative">
              <img
                src="/imgs/tv_panel_cropped.svg"
                alt=""
                aria-hidden
                className="w-full h-auto select-none pointer-events-none"
              />

              {/* Buttons overlay — Show Info / Schedule / Full Screen,
                  stacked in a column, each row = [toggle image] [label].
                  Position is %-based so it scales with the panel. */}
              <div
                className="absolute flex flex-col gap-1 min-[768px]:gap-3"
                style={{ left: '7%', top: '20%' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const next = overlay === 'show-info' ? 'none' : 'show-info'
                    playSfx(next === 'show-info' ? 'on' : 'off')
                    setOverlay(next)
                  }}
                  className="flex items-center gap-1 group"
                >
                  <img
                    src={
                      overlay === 'show-info'
                        ? '/imgs/tv_button_on.svg'
                        : '/imgs/tv_button_off.svg'
                    }
                    alt=""
                    aria-hidden
                    className="object-contain object-left select-none"
                    style={{ width: '27.2cqi', height: '24.85cqi' }}
                  />
                  <span
                    className="text-black"
                    style={{
                      fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
                      fontWeight: 700,
                      fontSize: '9cqi',
                      lineHeight: 1.1875,
                      letterSpacing: 0,
                    }}
                  >
                    Show info
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = overlay === 'schedule' ? 'none' : 'schedule'
                    playSfx(next === 'schedule' ? 'on' : 'off')
                    setOverlay(next)
                  }}
                  className="flex items-center gap-1 group"
                >
                  <img
                    src={
                      overlay === 'schedule'
                        ? '/imgs/tv_button_on.svg'
                        : '/imgs/tv_button_off.svg'
                    }
                    alt=""
                    aria-hidden
                    className="object-contain object-left select-none"
                    style={{ width: '27.2cqi', height: '24.85cqi' }}
                  />
                  <span
                    className="text-black"
                    style={{
                      fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
                      fontWeight: 700,
                      fontSize: '9cqi',
                      lineHeight: 1.1875,
                      letterSpacing: 0,
                    }}
                  >
                    Schedule
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSfx(isFullscreen ? 'off' : 'on')
                    handleFullscreen()
                  }}
                  className="flex items-center gap-1 group"
                >
                  <img
                    src={
                      isFullscreen
                        ? '/imgs/tv_button_on.svg'
                        : '/imgs/tv_button_off.svg'
                    }
                    alt=""
                    aria-hidden
                    className="object-contain object-left select-none"
                    style={{ width: '27.2cqi', height: '24.85cqi' }}
                  />
                  <span
                    className="text-black"
                    style={{
                      fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
                      fontWeight: 700,
                      fontSize: '9cqi',
                      lineHeight: 1.1875,
                      letterSpacing: 0,
                    }}
                  >
                    Fullscreen
                  </span>
                </button>
              </div>

              {/* Volume slider — meter is the housing; the bar acts as a CSS
                  mask over a black fill that grows up with volume; the switch
                  is the knob that travels vertically. Sizes are %-of-panel. */}
              <div
                ref={volumeMeterRef}
                className="absolute cursor-pointer select-none"
                style={{
                  left: '50%',
                  top: '60%',
                  transform: 'translateX(-50%)',
                  width: '20.05cqi',
                  height: '65.69cqi',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  isDraggingVolume.current = true
                  updateVolumeFromPointer(e.clientY)
                }}
                onPointerMove={(e) => {
                  if (!isDraggingVolume.current) return
                  updateVolumeFromPointer(e.clientY)
                }}
                onPointerUp={(e) => {
                  isDraggingVolume.current = false
                  e.currentTarget.releasePointerCapture(e.pointerId)
                }}
                onPointerCancel={() => {
                  isDraggingVolume.current = false
                }}
              >
                {/* Bar: positioned inside the meter, narrower than it.
                    Used as a CSS mask — the bar's shape carves out the visible
                    area of the black volume fill underneath. */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: '51%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `calc(${(8.443 / 33.882) * 100}% + 2px)`,
                    height: `${(104.545 / 111.022) * 100}%`,
                    maskImage: 'url(/imgs/tv_volume_bar.svg)',
                    maskSize: '100% 100%',
                    maskRepeat: 'no-repeat',
                    WebkitMaskImage: 'url(/imgs/tv_volume_bar.svg)',
                    WebkitMaskSize: '100% 100%',
                    WebkitMaskRepeat: 'no-repeat',
                  }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black"
                    style={{ height: `${volume * 100}%` }}
                  />
                </div>

                {/* Meter — the housing chrome, sits above the bar/fill */}
                <img
                  src="/imgs/tv_volume_meter.svg"
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Switch — the knob, slides up/down with volume.
                    Switch is wider than the meter (overhangs sides). Height is
                    24% of meter height; travel range is (100% − 24%) = 76%. */}
                <img
                  src="/imgs/tv_volume_switch.svg"
                  alt=""
                  aria-hidden
                  className="absolute pointer-events-none"
                  style={{
                    width: `${(38.308 / 33.882) * 100}%`,
                    left: '50%',
                    top: `${(1 - volume) * (100 - (26.619 / 111.022) * 100)}%`,
                    transform: 'translateX(-50%)',
                  }}
                  draggable={false}
                />
              </div>

              {/* Volume label — sits below the meter, centered horizontally
                  with it. Font size in cqi so it scales with the panel. */}
              <div
                className="absolute text-black text-center"
                style={{
                  left: '50%',
                  top: '90%',
                  transform: 'translateX(-50%)',
                  fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
                  fontWeight: 700,
                  fontSize: '9cqi',
                  lineHeight: 1.1875,
                  letterSpacing: 0,
                }}
              >
                Volume
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls + status — sit below the TV on every breakpoint */}
      <div className="w-full flex flex-col gap-3">
        {/* Status bar — live state only */}
        {screenState === 'live' && (
          <div className="flex items-center justify-between text-xs text-white/60 px-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ralph-pink animate-pulse" />
              <span>
                On now: <span className="text-white">{currentShow?.showName ?? 'Live'}</span>
              </span>
            </div>
            {nextShow && (
              <div>
                Up next: <span className="text-white">{nextShow.showName}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
