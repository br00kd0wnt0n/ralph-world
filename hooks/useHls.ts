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

    // hls.js for everything else (Chrome / Edge / Firefox) — tuned for
    // low-latency live
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveDurationInfinity: true,
        // Buffer targets — 2s segments. Raised from the initial aggressive
        // low-latency values (sync=4/max=10/buffer=30) after London testers
        // reported intermittent freezes. Bigger buffer costs ~10s of extra
        // wall-clock delay behind the encoder but survives slow-network
        // moments without stalling — for a passive-viewing TV loop that's
        // the right trade.
        liveSyncDuration: 8,
        liveMaxLatencyDuration: 20,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        // Retry network blips
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 6,
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
        if (!data.fatal) return

        // Auto-recover on fatal errors before giving up
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError()
            break
          default:
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
