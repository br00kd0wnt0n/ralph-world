'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Inline title SVG. Injects the raw SVG markup (via innerHTML) rather than an
 * <img> so CSS can recolour the fill/stroke per theme — the title art ships as
 * white fill + coloured (accent) stroke; `[data-theme="light"] .title-art …`
 * in globals.css flips it to black fill / white stroke.
 *
 * Each SVG is fetched once and cached at module scope.
 */
const cache = new Map<string, Promise<string>>()
function loadSvg(url: string): Promise<string> {
  let p = cache.get(url)
  if (!p) {
    p = fetch(url, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
    cache.set(url, p)
  }
  return p
}

interface TitleArtProps {
  src: string
  /** Accessible name (rendered on the wrapping role="img"). */
  alt: string
  width: number | string
  height: number | string
  className?: string
  style?: React.CSSProperties
}

export default function TitleArt({ src, alt, width, height, className = '', style }: TitleArtProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [markup, setMarkup] = useState('')

  useEffect(() => {
    let cancelled = false
    loadSvg(src).then((m) => {
      if (!cancelled) setMarkup(m)
    })
    return () => {
      cancelled = true
    }
  }, [src])

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = markup
  }, [markup])

  return (
    <span
      ref={ref}
      role="img"
      aria-label={alt}
      className={`title-art ${className}`.trim()}
      style={{ display: 'inline-block', width, height, lineHeight: 0, ...style }}
    />
  )
}
