'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

/**
 * Attaches HLS stream to a video element. Handles native HLS (Safari) and hls.js (everywhere else).
 * Tuned for low-latency live streams with small segments.
 * Returns videoRef, isReady, and error state.
 */
export function useHls(streamUrl: string | null) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) {
      setIsReady(false)
      return
    }

    setError(null)
    setIsReady(false)

    // Prefer hls.js when the browser supports MSE — Chrome 149+ started
    // reporting `canPlayType('application/vnd.apple.mpegurl') === "maybe"`
    // for "native" HLS, but the built-in demuxer errors out with
    // DEMUXER_ERROR_COULD_NOT_PARSE on our stream and the <video> ends
    // up in error.code=4 with no playback. hls.js works fine there.
    // Only fall back to native HLS in real Safari, where MSE-based
    // hls.js can't work (Hls.isSupported() returns false) but native
    // HLS actually plays.
    if (!Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl
      const onLoaded = () => {
        setIsReady(true)
        // Muted autoplay should be allowed everywhere
        video.play().catch((err) => {
          console.warn('[hls] autoplay blocked:', err)
        })
      }
      video.addEventListener('loadedmetadata', onLoaded)
      return () => {
        video.removeEventListener('loadedmetadata', onLoaded)
        video.removeAttribute('src')
        video.load()
      }
    }

    // hls.js for everything else (Chrome / Edge / Firefox).
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        // lowLatencyMode is for LL-HLS streams (with EXT-X-PART / EXT-X-
        // SERVER-CONTROL markers). Bunny serves standard HLS v3 with
        // 2s segments — no LL support. Enabling LL mode on a non-LL
        // stream made hls.js chase the live edge so aggressively it
        // exhausted its buffer on any network micro-stall and froze
        // 5-10s in. Explicitly false.
        lowLatencyMode: false,
        liveDurationInfinity: true,
        // Buffer targets — comfortable for a passive-viewing TV loop.
        // We accept ~10s wall-clock delay behind the encoder to survive
        // slow-network moments cleanly.
        liveSyncDuration: 8,
        liveMaxLatencyDuration: 20,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        // Retry counts — bumped after freezing reports. CDN edges
        // occasionally 5xx a single .ts; more retries survive it.
        manifestLoadingMaxRetry: 10,
        levelLoadingMaxRetry: 10,
        fragLoadingMaxRetry: 10,
        // When the video element stalls at a specific timestamp
        // (missing frame, decoder blip), hls.js nudges the currentTime
        // forward to unstick it. Defaults are low; bump so a stall
        // gets more chances to auto-recover before giving up.
        nudgeOffset: 0.5,
        nudgeMaxRetry: 10,
      })
      hlsRef.current = hls

      hls.loadSource(streamUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true)
        // Kick off playback (muted autoplay is allowed)
        video.play().catch((err) => {
          console.warn('[hls] autoplay blocked:', err)
        })
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        // Non-fatal buffer stalls: hls.js emits these when playback is
        // stuck because the buffer went empty. Not usually recoverable
        // via startLoad (loader is often already trying), but nudging
        // playback past the stall point can free it. hls.js already
        // does this via nudgeOffset/nudgeMaxRetry above — nothing to
        // do here beyond logging for observability.
        if (!data.fatal) {
          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            console.warn('[hls] buffer stalled — hls.js will nudge')
          }
          return
        }

        // Fatal errors: attempt recovery before giving up.
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.warn('[hls] fatal network error — reloading source', data.details)
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.warn('[hls] fatal media error — recovering', data.details)
            hls.recoverMediaError()
            break
          default:
            console.error('[hls] fatal error, giving up', data.type, data.details)
            setError(data.type)
            hls.destroy()
        }
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    setError('HLS not supported in this browser')
  }, [streamUrl])

  return { videoRef, isReady, error }
}
