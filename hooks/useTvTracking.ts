'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { pickAttribution } from '@/lib/attribution'
import {
  createTvTracker,
  HEARTBEAT_SEC,
  referrerHost,
  type TvEvent,
  type TvEventName,
  type TvSurface,
} from '@/lib/analytics/tv-tracker'

/** Mark any player <video> with this attribute so the tracker can find it. */
export const TV_VIDEO_ATTR = 'data-ralphtv-video'
/** LivePlayer dispatches this on window when HLS gives up (offline fallback shown). */
export const TV_ERROR_EVENT = 'ralphtv:error'

const PAGE_VIEW_DELAY_MS = 1_500 // let auth settle so is_guest is right
const OFFLINE_AFTER_MS = 10_000
const STALL_TICKS = 3 // seconds of "playing but no data" before we call it a stall

interface NowPlayingLike {
  assetId?: string
  offsetSec?: number | null
  durationSec?: number | null
}

interface Options {
  surface: TvSurface
  /** What the streamer says is on air; drives asset_id + offset_sec. */
  current?: NowPlayingLike | null
  isGuest?: boolean
  isLive?: boolean
}

function activeVideo(): HTMLVideoElement | null {
  const all = Array.from(document.querySelectorAll<HTMLVideoElement>(`video[${TV_VIDEO_ATTR}]`))
  return all.find((v) => !v.paused && !v.ended) ?? all[0] ?? null
}

/**
 * Page-level Ralph TV analytics. Counts watch seconds only while a player video
 * is actually playing and the tab is visible, sends a heartbeat every
 * HEARTBEAT_SEC watched seconds, and reports the tab hiding/closing as the exit.
 * Returns `track` for UI events (overlay opened, gate shown, …).
 */
export function useTvTracking({ surface, current, isGuest = true, isLive = false }: Options) {
  const [tracker] = useState(() => createTvTracker(surface))
  const watch = useRef(0)
  const started = useRef(false)
  const lastMuted = useRef<boolean | null>(null)
  const np = useRef<{ assetId?: string; offsetSec: number; durationSec?: number | null; at: number } | null>(null)
  const latest = useRef({ isGuest, isLive })
  useEffect(() => {
    latest.current = { isGuest, isLive }
  }, [isGuest, isLive])

  const position = useCallback((): Pick<TvEvent, 'asset_id' | 'offset_sec'> => {
    const p = np.current
    if (!p?.assetId) return {}
    let off = p.offsetSec + (performance.now() - p.at) / 1000
    if (p.durationSec && p.durationSec > 0) off = Math.min(off, p.durationSec)
    return { asset_id: p.assetId, offset_sec: Math.max(0, Math.round(off)) }
  }, [])

  const track = useCallback(
    (event: TvEventName, extra: Omit<TvEvent, 'event'> = {}) => {
      tracker.track({ event, ...position(), watch_sec: watch.current, ...extra })
    },
    [tracker, position]
  )

  // Now-playing anchor (re-anchored on every poll) + show changes while watching.
  useEffect(() => {
    if (!current?.assetId) return
    const prev = np.current?.assetId
    np.current = {
      assetId: current.assetId,
      offsetSec: typeof current.offsetSec === 'number' ? current.offsetSec : 0,
      durationSec: current.durationSec,
      at: performance.now(),
    }
    if (prev && prev !== current.assetId && started.current && document.visibilityState === 'visible') {
      track('show_change', { props: { prev_asset_id: prev } })
    }
  }, [current, track])

  // Page view (once), and "arrived while off air" if the stream never came up.
  useEffect(() => {
    const pv = setTimeout(() => {
      const utm = pickAttribution(new URLSearchParams(window.location.search))
      tracker.track({
        event: 'page_view',
        props: {
          ref: referrerHost(document.referrer, window.location.hostname),
          utm_source: utm.utm_source,
          utm_medium: utm.utm_medium,
          utm_campaign: utm.utm_campaign,
          is_guest: latest.current.isGuest,
          path: window.location.pathname,
        },
      })
    }, PAGE_VIEW_DELAY_MS)
    const off = setTimeout(() => {
      if (!latest.current.isLive && !started.current) tracker.track({ event: 'offline_view' })
    }, OFFLINE_AFTER_MS)
    return () => { clearTimeout(pv); clearTimeout(off) }
  }, [tracker])

  // 1s ticker: watch time, play start, heartbeats, mute changes, stalls.
  useEffect(() => {
    let waitTicks = 0
    const tick = setInterval(() => {
      const v = activeVideo()
      if (!v) { waitTicks = 0; return }
      const muted = v.muted || v.volume === 0
      const buffering = !v.paused && !v.ended && v.readyState < 3
      waitTicks = buffering ? waitTicks + 1 : 0
      if (waitTicks === STALL_TICKS && started.current) track('stall', { props: { kind: 'buffering' } })

      const playing = !v.paused && !v.ended && v.readyState >= 3
      if (!playing || document.visibilityState !== 'visible') return
      if (!started.current) {
        started.current = true
        lastMuted.current = muted
        track('play_start', { muted })
      }
      if (lastMuted.current !== null && muted !== lastMuted.current) track(muted ? 'mute' : 'unmute', { muted })
      lastMuted.current = muted
      watch.current += 1
      if (watch.current % HEARTBEAT_SEC === 0) track('heartbeat', { muted })
    }, 1_000)
    return () => clearInterval(tick)
  }, [track])

  // Exit signals. A session's last 'hidden' is where it ended.
  useEffect(() => {
    let hidden = false
    const onHide = () => {
      if (hidden) return
      hidden = true
      track('hidden')
      tracker.flush()
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') onHide()
      else if (hidden) { hidden = false; track('visible') }
    }
    const onError = (e: Event) => {
      const kind = (e as CustomEvent<{ kind?: string }>).detail?.kind ?? 'playback'
      track('error', { props: { kind } })
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    window.addEventListener(TV_ERROR_EVENT, onError)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener(TV_ERROR_EVENT, onError)
      // Client-side navigation away from the player also ends the visit.
      onHide()
    }
  }, [track, tracker])

  return track
}
