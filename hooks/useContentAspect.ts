'use client'

import { useEffect, useState } from 'react'
import type { ContentAspect } from '@/lib/broadcaster/types'

/**
 * Fallback orientation detection for clips that have no source-dimension metadata
 * yet (the broadcaster backfills `aspect` asynchronously; new uploads get it at
 * transcode time). Samples the decoded frame on a tiny canvas every few seconds.
 *
 * Signature of a pillarboxed portrait clip in the 16:9 stream: the columns at 25%
 * and 75% of the width are black (they sit inside the pillars — a 9:16 clip occupies
 * 31.6%–68.4%) while the columns at 40%/60% carry picture. Landscape content almost
 * never has a black band that wide on both sides, and letterboxed landscape clips
 * (bars top/bottom) never match. Needs three consecutive agreeing samples before
 * changing its answer; ignores frames that are dark everywhere (fades, slates).
 *
 * Canvas readback needs the media to be CORS-readable. hls.js feeds MSE, so the
 * element is never tainted; native HLS (Safari) needs `crossOrigin="anonymous"` on
 * the <video> plus `Access-Control-Allow-Origin` from the CDN — both in place.
 * If readback throws anyway the hook gives up quietly and returns null.
 */
export function useContentAspect(
  video: HTMLVideoElement | null,
  enabled: boolean,
): ContentAspect | null {
  const [aspect, setAspect] = useState<ContentAspect | null>(null)

  useEffect(() => {
    if (!enabled || !video) return
    const W = 64
    const H = 36
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let streak: ContentAspect | null = null
    let count = 0
    let stopped = false

    const luma = (d: Uint8ClampedArray, x: number, y: number) => {
      const i = (y * W + x) * 4
      return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    }
    const columnMean = (d: Uint8ClampedArray, x: number) => {
      let sum = 0
      for (let y = 3; y < H - 3; y++) sum += luma(d, x, y)
      return sum / (H - 6)
    }

    const sample = () => {
      if (stopped || video.readyState < 2 || video.videoWidth === 0) return
      try {
        ctx.drawImage(video, 0, 0, W, H)
        const d = ctx.getImageData(0, 0, W, H).data
        const pillars = (columnMean(d, Math.round(W * 0.25)) + columnMean(d, Math.round(W * 0.75))) / 2
        const picture = (columnMean(d, Math.round(W * 0.4)) + columnMean(d, Math.round(W * 0.6))) / 2
        if (picture < 24) return // dark frame — no information either way
        const guess: ContentAspect = pillars < 16 && picture - pillars > 40 ? 'portrait' : 'landscape'
        if (guess === streak) count += 1
        else {
          streak = guess
          count = 1
        }
        if (count >= 3) setAspect(guess)
      } catch {
        // Tainted canvas (CORS) or a detached element — nothing more we can learn.
        stopped = true
        clearInterval(timer)
      }
    }

    const timer = setInterval(sample, 2000)
    sample()
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [video, enabled])

  return enabled ? aspect : null
}
