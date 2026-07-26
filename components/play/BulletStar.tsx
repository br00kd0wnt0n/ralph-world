'use client'

import { useEffect, useRef, useState } from 'react'

// Inline the star SVG (via innerHTML) rather than an <img> so CSS can recolour
// its white paths per theme while leaving the pink ones. Fetched once, cached.
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

interface BulletStarProps {
  src: string
  className?: string
  style?: React.CSSProperties
}

export default function BulletStar({ src, className = '', style }: BulletStarProps) {
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
      aria-hidden="true"
      className={`bullet-star ${className}`.trim()}
      style={style}
    />
  )
}
