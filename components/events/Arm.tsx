'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Inline SVG arm whose sleeve fill is driven by the parent's `color` — the
 * canonical /imgs/arm.svg has its sleeve paths set to `fill:currentColor`,
 * dark outlines + white highlights baked in as fixed hex.
 *
 * We fetch the SVG once and cache the raw XML at module scope so multiple
 * arms on a page share a single network round-trip and the same string,
 * then render each via dangerouslySetInnerHTML — <img> would rasterise
 * the SVG and CSS colour wouldn't inherit.
 */

const ARM_SVG_URL = '/imgs/arm.svg'

let armSvgPromise: Promise<string> | null = null
function loadArmSvg(): Promise<string> {
  if (!armSvgPromise) {
    armSvgPromise = fetch(ARM_SVG_URL, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
  }
  return armSvgPromise
}

interface ArmProps {
  /** Sleeve colour. Any CSS colour string — hex, keyword, whatever. */
  color?: string | null
  /** Passed straight to the wrapper. */
  className?: string
  style?: React.CSSProperties
}

export default function Arm({ color, className, style }: ArmProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    loadArmSvg().then((markup) => {
      if (!cancelled) setSvg(markup)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ref.current || !svg) return
    // dangerouslySetInnerHTML via a state string re-renders on every
    // color change, wiping the SVG DOM. Setting innerHTML manually only
    // when svg content changes lets us update the wrapper's inline color
    // freely without re-parsing 34KB of XML on every render.
    if (ref.current.dataset.svgLoaded !== 'true') {
      ref.current.innerHTML = svg
      ref.current.dataset.svgLoaded = 'true'
    }
  }, [svg])

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
