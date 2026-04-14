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

    // Native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
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

    // hls.js for everyone else — tuned for low-latency live
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveDurationInfinity: true,
        // Buffer targets for 1s segments
        liveSyncDuration: 4,
        liveMaxLatencyDuration: 10,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
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
