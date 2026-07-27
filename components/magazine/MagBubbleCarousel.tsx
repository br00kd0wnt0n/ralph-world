'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperClass } from 'swiper/types'
import 'swiper/css'
import FadeImage from '@/components/shop/FadeImage'
import type { ShopifyImage } from '@/lib/shopify/types'

// Inline the bubble SVG (rather than an <img>) so CSS can recolour its orange
// body to off-black in light mode. Fetched once, cached at module scope.
let bubbleSvgPromise: Promise<string> | null = null
function loadBubbleSvg(): Promise<string> {
  if (!bubbleSvgPromise) {
    bubbleSvgPromise = fetch('/imgs/mag_bubble.svg', { cache: 'force-cache' })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
  }
  return bubbleSvgPromise
}

interface MagBubbleCarouselProps {
  open: boolean
  onClose: () => void
  /** Gallery images of the latest magazine issue (same set as its product page). */
  images: ShopifyImage[]
}

// Speech-bubble overlay fired by the magazine planet creature. Shows the LATEST
// magazine issue's product-page gallery in a carousel, inside the mag_bubble.svg
// art (612 × 419). Centred horizontally, 180px from the top.
export default function MagBubbleCarousel({
  open,
  onClose,
  images,
}: MagBubbleCarouselProps) {
  const swiperRef = useRef<SwiperClass | null>(null)
  const [index, setIndex] = useState(0)

  // Inline bubble SVG so it can recolour in light mode.
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [bubbleSvg, setBubbleSvg] = useState('')
  useEffect(() => {
    let cancelled = false
    loadBubbleSvg().then((svg) => {
      if (!cancelled) setBubbleSvg(svg)
    })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    if (bubbleRef.current) bubbleRef.current.innerHTML = bubbleSvg
  }, [bubbleSvg, open])

  // Only available from 992px up (matches the hidden trigger); close if the
  // viewport drops below while open.
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 992px)')
    const sync = () => setWide(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (open && !wide) onClose()
  }, [open, wide, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock page scroll while the bubble is open. The document scrolls on the
  // <html> element, so lock both it and <body>.
  useEffect(() => {
    if (!(open && wide)) return
    const html = document.documentElement
    const prevHtml = html.style.overflow
    const prevBody = document.body.style.overflow
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [open, wide])

  if (!open || !wide) return null

  const shots = images.filter((img) => img.url)
  const showNav = shots.length > 1

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Latest magazine issues"
    >
      {/* Backdrop — click to dismiss */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 cursor-default"
      />

      {/* Bubble */}
      <div
        className="absolute"
        style={{ top: 120, width: 612, maxWidth: 'calc(100vw - 24px)' }}
      >
        <div
          ref={bubbleRef}
          aria-hidden="true"
          className="mag-bubble block w-full pointer-events-none select-none"
        />

        {/* Close shadow button, top-right */}
        <div className="absolute z-20" style={{ top: 46, right: 46 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: '100%',
                height: '100%',
                backgroundColor: 'black',
                pointerEvents: 'none',
              }}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn-press"
              style={{
                position: 'relative',
                width: 44,
                height: 43,
                border: '2px solid black',
                backgroundColor: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M3 3L19 19M19 3L3 19"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content sitting inside the bubble body (tail is at the bottom) */}
        <div
          className="absolute flex flex-col"
          style={{ top: 44, left: 52, right: 52 }}
        >
          <div style={{ paddingLeft: 50, paddingRight: 50 }}>
            <p
              className="text-white"
              style={{
                fontFamily: "'Gooper Trial', serif",
                fontWeight: 600,
                fontSize: 22,
                lineHeight: 1,
                letterSpacing: 0,
              }}
            >
              Oi no peaking
            </p>
            <p
              className="text-white mt-1"
              style={{
                fontFamily: 'var(--font-body), Roboto, sans-serif',
                fontWeight: 700,
                fontSize: 18,
                lineHeight: '28px',
                letterSpacing: 0,
              }}
            >
              Oh... go on then. This issue is the nuts!
            </p>
          </div>

          {/* Carousel */}
          <div className="relative mt-3 shrink-0" style={{ height: 230 }}>
            <Swiper
              onSwiper={(s) => {
                swiperRef.current = s
              }}
              onSlideChange={(s) => setIndex(s.realIndex)}
              loop={showNav}
              speed={400}
              className="w-full h-full"
            >
              {shots.map((img, i) => (
                <SwiperSlide key={`${img.url}-${i}`}>
                  <div className="relative w-full h-full">
                    <FadeImage
                      src={img.url}
                      alt={img.altText ?? ''}
                      sizes="512px"
                      className="object-contain"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {showNav && (
              <>
                <button
                  type="button"
                  onClick={() => swiperRef.current?.slidePrev()}
                  aria-label="Previous"
                  className="bg-black text-white hover:bg-black/80 light:bg-white light:text-black light:hover:bg-white/90 absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
                  style={{ width: 30, height: 30, left: -15 }}
                >
                  <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                    <path
                      d="M8 1L2 7L8 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => swiperRef.current?.slideNext()}
                  aria-label="Next"
                  className="bg-black text-white hover:bg-black/80 light:bg-white light:text-black light:hover:bg-white/90 absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
                  style={{ width: 30, height: 30, right: -15 }}
                >
                  <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                    <path
                      d="M2 1L8 7L2 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Pips — 13×13, 2px radius; white fill = inactive, transparent = active */}
          {showNav && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {shots.map((img, i) => (
                <button
                  key={`${img.url}-${i}`}
                  type="button"
                  onClick={() => swiperRef.current?.slideToLoop(i)}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    border: '2px solid white',
                    backgroundColor: i === index ? 'transparent' : 'white',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
