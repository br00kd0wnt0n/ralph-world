'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Inline SVG arm whose sleeve fill is driven by the parent's `color`. The
 * canonical arm SVGs live at /imgs/arm_1.svg … /imgs/arm_N.svg with their
 * sleeve paths set to `fill:currentColor`; dark outlines + white highlights
 * stay baked in as fixed hex.
 *
 * ARM_SHAPES is the ordered list of shape URLs. Add a new shape by
 * dropping arm_5.svg (etc.) into public/imgs/ AND appending its URL here
 * — MinglingCharacters cycles arms by `i % ARM_SHAPES.length`, so extra
 * shapes light up immediately.
 *
 * We fetch each shape once and cache the raw XML per URL at module
 * scope so multiple arms of the same shape share a single network
 * round-trip. Rendering via dangerouslySetInnerHTML — <img> would
 * rasterise the SVG and CSS colour wouldn't inherit.
 */

export const ARM_SHAPES: readonly string[] = [
  '/imgs/arm_1.svg',
  '/imgs/arm_2.svg',
  '/imgs/arm_3.svg',
  '/imgs/arm_4.svg',
  // '/imgs/arm_5.svg' — reserved slot; add when design ships the 5th shape.
]

const cacheByUrl = new Map<string, Promise<string>>()
function loadArmSvg(url: string): Promise<string> {
  let p = cacheByUrl.get(url)
  if (!p) {
    p = fetch(url, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
    cacheByUrl.set(url, p)
  }
  return p
}

interface ArmProps {
  /** 0-indexed position into ARM_SHAPES; wraps modulo the array length. */
  shapeId?: number
  /** Sleeve colour. Any CSS colour string — hex, keyword, whatever. */
  color?: string | null
  /** Passed straight to the wrapper. */
  className?: string
  style?: React.CSSProperties
}

export default function Arm({
  shapeId = 0,
  color,
  className,
  style,
}: ArmProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')

  const url = ARM_SHAPES[
    ((shapeId % ARM_SHAPES.length) + ARM_SHAPES.length) % ARM_SHAPES.length
  ]

  useEffect(() => {
    let cancelled = false
    // Reset before load so a shape switch doesn't briefly render the old
    // markup with the new colour.
    setSvg('')
    loadArmSvg(url).then((markup) => {
      if (!cancelled) setSvg(markup)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    if (!ref.current) return
    if (!svg) {
      ref.current.innerHTML = ''
      delete ref.current.dataset.svgLoaded
      return
    }
    // Only touch innerHTML when the svg string changes — updating the
    // wrapper's inline `color` shouldn't re-parse 30KB of XML.
    if (ref.current.dataset.svgLoaded !== url) {
      ref.current.innerHTML = svg
      ref.current.dataset.svgLoaded = url
    }
  }, [svg, url])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        color: color ?? 'var(--color-ralph-green)',
        display: 'inline-block',
        lineHeight: 0,
        ...style,
      }}
    />
  )
}
