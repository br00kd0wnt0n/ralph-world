'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

/**
 * Attaches HLS stream to a video element. Handles native HLS (Safari) and hls.js (everywhere else).
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
      video.addEventListener('loadedmetadata', () => setIsReady(true))
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    // hls.js fallback
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
      hlsRef.current = hls

      hls.loadSource(streamUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => setIsReady(true))
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError(data.type)
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
