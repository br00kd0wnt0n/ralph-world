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
import TVControls from './TVControls'
import type { ScheduleItem } from '@/lib/broadcaster/types'

export type TVOverlayState = 'none' | 'show-info' | 'schedule'

interface TVSetProps {
  onSubscribe: () => void
  offlineLabel?: string
  offlineMessage?: string
  subscribeHeading?: string
  subscribeBody?: string
}

export default function TVSet({
  onSubscribe,
  offlineLabel = 'OFFLINE',
  offlineMessage = 'Tune in later',
  subscribeHeading,
  subscribeBody,
}: TVSetProps) {
  const { user } = useAuth()
  const { isLive } = useLiveStatus()
  const [overlay, setOverlay] = useState<TVOverlayState>('none')
  const [volume, setVolume] = useState(0.7)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('ralph-tv-volume')
    if (stored) setVolume(Number(stored))
  }, [])

  useEffect(() => {
    localStorage.setItem('ralph-tv-volume', String(volume))
  }, [volume])

  // Fetch schedule when overlay opens
  useEffect(() => {
    if (overlay === 'none') return
    fetch('/api/broadcaster/schedule')
      .then((r) => r.json())
      .then((data) => setSchedule(Array.isArray(data) ? data : []))
      .catch(() => setSchedule([]))
  }, [overlay])

  function handleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen?.()
    }
  }

  const currentShow = schedule[0]
  const nextShow = schedule[1]
  const isGuest = !user

  // Determine screen state
  let screenState: 'live' | 'subscribe-gate' | 'offline' = 'offline'
  if (isLive && isGuest) {
    screenState = 'subscribe-gate'
  } else if (isLive) {
    screenState = 'live'
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 max-w-6xl mx-auto">
      {/* Left: small character placeholder */}
      <div className="hidden md:block w-16 h-24 bg-ralph-teal/10 rounded-lg items-center justify-center text-[10px] text-muted shrink-0 flex">
        alien
      </div>

      {/* TV SET */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-surface rounded-3xl p-4 md:p-6 border-4 border-white/10 shadow-2xl"
      >
        {/* Bezel top: knobs */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-ralph-pink" />
          <div className="w-3 h-3 rounded-full bg-ralph-yellow" />
          <div className="w-3 h-3 rounded-full bg-ralph-teal" />
          <div className="flex-1" />
          <div className="text-[10px] text-white/40 tracking-widest font-mono">
            CH.01
          </div>
        </div>

        <div className="flex gap-4">
          {/* Screen */}
          <div
            className="relative aspect-[4/3] flex-1 bg-black rounded-lg overflow-hidden border-2 border-black"
            style={{ maxHeight: '60vh' }}
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

          {/* Right control panel (desktop) */}
          <div className="hidden md:flex shrink-0 w-24">
            <TVControls
              overlay={overlay}
              onToggleOverlay={setOverlay}
              onFullscreen={handleFullscreen}
              volume={volume}
              onVolumeChange={setVolume}
            />
          </div>
        </div>

        {/* Status bar (below screen) — live state only */}
        {screenState === 'live' && (
          <div className="mt-3 flex items-center justify-between text-xs text-white/60 px-2">
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

        {/* Bezel bottom: RALPH text */}
        <div className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-white/5">
          <span className="text-white/30 text-xs tracking-[0.5em] font-mono">
            R A L P H
          </span>
        </div>
      </div>

      {/* Right: character placeholder */}
      <div className="hidden md:block w-16 h-24 bg-ralph-pink/10 rounded-lg items-center justify-center text-[10px] text-muted shrink-0 flex">
        robot
      </div>

      {/* Mobile controls (below TV) */}
      <div className="md:hidden w-full">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setOverlay(overlay === 'show-info' ? 'none' : 'show-info')}
            className={`rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-wide border ${
              overlay === 'show-info'
                ? 'bg-ralph-pink text-white border-ralph-pink'
                : 'bg-black/50 text-white border-white/20'
            }`}
          >
            Show Info
          </button>
          <button
            onClick={() => setOverlay(overlay === 'schedule' ? 'none' : 'schedule')}
            className={`rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-wide border ${
              overlay === 'schedule'
                ? 'bg-ralph-teal text-white border-ralph-teal'
                : 'bg-black/50 text-white border-white/20'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={handleFullscreen}
            className="rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-wide border bg-black/50 text-white border-white/20"
          >
            Fullscreen
          </button>
        </div>
      </div>
    </div>
  )
}
