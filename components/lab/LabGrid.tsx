'use client'

import { useEffect, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperClass } from 'swiper/types'
import 'swiper/css'
import { useAuth } from '@/context/AuthContext'
import {
  canAccess,
  type AccessTier,
  type UserTier,
} from '@/lib/entitlements'
import type { LabItem } from '@/lib/data/lab'

interface LabGridProps {
  items: LabItem[]
  onItemClick: (item: LabItem) => void
}

/** Strip HTML + truncate. Used to derive a plain-text teaser from the
 *  Tiptap-authored description without rendering its tags inside a card. */
function teaser(html: string | null, max = 160): string {
  if (!html) return ''
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}

// How far (px) a hovered tile's card pushes outward from the grid centre.
const EXPLODE_PX = 14

// Slanted 3D extrusion side (as in the magazine ArticleGrid). Each hovered tile
// shows up to two solid faces (one per moving axis); the clip-path animates from
// a collapsed edge to a trapezoid connecting the resting cell edge to the moved
// card, drawing the side of an extruded block. The face box is K px larger than
// the cell on every side (inset: -K), so coordinates address that larger box.
function faceClipPath(
  axis: 'x' | 'y',
  dx: number,
  dy: number,
  K: number,
  hovered: boolean,
): string {
  const px = (n: number) => `${n}px`
  const calc = (n: number) => `calc(100% - ${n}px)`
  const cellL = px(K)
  const cellR = calc(K)
  const cellT = px(K)
  const cellB = calc(K)
  const mvdL = px((1 + dx) * K)
  const mvdR = calc((1 - dx) * K)
  const mvdT = px((1 + dy) * K)
  const mvdB = calc((1 - dy) * K)

  if (axis === 'y') {
    if (dy === 0) return 'polygon(0 0, 0 0, 0 0, 0 0)'
    const cellEdge = dy < 0 ? cellB : cellT
    const mvdEdge = dy < 0 ? mvdB : mvdT
    if (hovered) {
      return `polygon(${mvdL} ${mvdEdge}, ${mvdR} ${mvdEdge}, ${cellR} ${cellEdge}, ${cellL} ${cellEdge})`
    }
    return `polygon(${cellL} ${cellEdge}, ${cellR} ${cellEdge}, ${cellR} ${cellEdge}, ${cellL} ${cellEdge})`
  }

  if (dx === 0) return 'polygon(0 0, 0 0, 0 0, 0 0)'
  const cellEdge = dx < 0 ? cellR : cellL
  const mvdEdge = dx < 0 ? mvdR : mvdL
  if (hovered) {
    return `polygon(${mvdEdge} ${mvdT}, ${cellEdge} ${cellT}, ${cellEdge} ${cellB}, ${mvdEdge} ${mvdB})`
  }
  return `polygon(${cellEdge} ${cellT}, ${cellEdge} ${cellT}, ${cellEdge} ${cellB}, ${cellEdge} ${cellB})`
}

// The card's visual content (image + text panel), shared by the grid tiles and
// the mobile carousel slides.
function LabCardInner({ item, isLocked }: { item: LabItem; isLocked: boolean }) {
  return (
    <>
      {item.thumbnailUrl && (
        <div className="w-full aspect-[4/3] overflow-hidden bg-ralph-yellow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnailUrl}
            alt={item.title ?? ''}
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-60"
          />
        </div>
      )}

      <div className="p-6 flex flex-col gap-3 flex-1">
        {item.subtitle && (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ralph-pink light:text-black">
            {item.subtitle}
          </p>
        )}

        <h2
          className="text-black"
          style={{
            fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
            fontWeight: 600,
            fontSize: 26,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}
        >
          {item.title}
        </h2>

        {/* Plain-text teaser — sanitised at render-time by stripping tags so the
            card layout stays predictable. Full HTML is in the overlay. */}
        {item.description && (
          <p
            className="text-black/80"
            style={{
              fontFamily: 'var(--font-body), Arial, sans-serif',
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {teaser(item.description)}
          </p>
        )}

        <div className="mt-auto pt-3">
          <span
            className="inline-flex items-center text-ralph-pink light:text-black"
            style={{
              fontFamily: 'var(--font-intro, "Gooper Trial"), serif',
              fontWeight: 600,
              fontSize: 18,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            {isLocked ? 'Subscribe to access' : 'Read more'} &nbsp;&gt;
          </span>
        </div>
      </div>
    </>
  )
}

export default function LabGrid({ items, onItemClick }: LabGridProps) {
  const { tier } = useAuth()
  const userEntitlement =
    tier && tier !== 'guest' ? { tier: tier as UserTier } : null
  const isLocked = (item: LabItem) =>
    !canAccess(userEntitlement, {
      accessTier: (item.accessTier ?? 'everyone') as AccessTier,
    })

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  // Live column count (drives the explode direction) + a <768 flag that swaps
  // the grid for a swipeable carousel.
  const [cols, setCols] = useState(3)
  const [isMobile, setIsMobile] = useState(false)
  // Touch devices skip the explode-on-hover (it would fire on tap).
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    const lg = window.matchMedia('(min-width: 1200px)')
    const sm = window.matchMedia('(max-width: 767px)')
    const touch = window.matchMedia('(hover: none)')
    const sync = () => {
      setCols(lg.matches ? 3 : 2)
      setIsMobile(sm.matches)
      setIsTouch(touch.matches)
    }
    sync()
    lg.addEventListener('change', sync)
    sm.addEventListener('change', sync)
    touch.addEventListener('change', sync)
    return () => {
      lg.removeEventListener('change', sync)
      sm.removeEventListener('change', sync)
      touch.removeEventListener('change', sync)
    }
  }, [])

  const swiperRef = useRef<SwiperClass | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  if (items.length === 0) {
    return (
      <section className="px-6 py-16 text-center">
        <p className="text-secondary light:text-white/70">No experiments yet — check back soon.</p>
      </section>
    )
  }

  // Lab surface is white in dark mode / #232323 in light, so the arrows invert
  // the opposite way to the case-study carousel: black in dark, white in light.
  const arrowClass =
    'bg-black text-white hover:bg-black/80 light:bg-white light:text-black light:hover:bg-white/90 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-default'

  return (
    <section className="relative px-6 pb-12" style={{ paddingTop: isMobile ? 100 : 160 }}>
      {isMobile ? (
        /* < 768: full-bleed swipeable carousel with case-study-style arrows +
           pips. Breaks out of the section padding to the screen edges. */
        <div className="relative z-[1] left-1/2 -translate-x-1/2 w-screen">
          <Swiper
            onSwiper={(s) => {
              swiperRef.current = s
            }}
            onSlideChange={(s) => setActiveIndex(s.realIndex)}
            slidesPerView={1.15}
            spaceBetween={16}
            centeredSlides
            loop={items.length > 1}
            className="w-full lab-carousel"
          >
            {items.map((item) => (
              <SwiperSlide key={item.id} className="h-auto">
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="w-full h-full text-left bg-white border-2 border-black overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ralph-pink"
                  aria-label={`Open ${item.title ?? 'experiment'}`}
                >
                  <LabCardInner item={item} isLocked={isLocked(item)} />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>

          {items.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => swiperRef.current?.slidePrev()}
                aria-label="Previous"
                className={arrowClass}
                style={{ width: 30, height: 30 }}
              >
                <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                  <path d="M8 1L2 7L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => swiperRef.current?.slideToLoop(i)}
                    aria-label={`Go to experiment ${i + 1}`}
                    className="cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={i === activeIndex ? '/imgs/bullet_on.svg' : '/imgs/bullet_off.svg'}
                      alt=""
                      aria-hidden="true"
                      width={16}
                      height={16}
                      className="block light:grayscale"
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => swiperRef.current?.slideNext()}
                aria-label="Next"
                className={arrowClass}
                style={{ width: 30, height: 30 }}
              >
                <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                  <path d="M2 1L8 7L2 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* >= 768: tight square-cornered grid. Each entry has its own 2px border
           and extrudes a solid ralph-yellow 3D side on hover (direction from its
           grid position). 3 columns from 1200px, 2 below. */
        <div className="max-w-6xl mx-auto grid grid-cols-2 min-[1200px]:grid-cols-3">
          {items.map((item, i) => {
            const rows = Math.ceil(items.length / cols)
            const col = i % cols
            const row = Math.floor(i / cols)
            const dx = Math.sign(col - (cols - 1) / 2)
            const dy = Math.sign(row - (rows - 1) / 2)
            const isHovered = hoveredId === item.id
            const popTransition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            const faceTransition = 'clip-path 0.4s cubic-bezier(0.16, 1, 0.3, 1)'

            return (
              <div
                key={item.id}
                className="relative"
                style={{ zIndex: isHovered ? 10 : 1 }}
                onMouseEnter={() => !isTouch && setHoveredId(item.id)}
                onMouseLeave={() => !isTouch && setHoveredId(null)}
              >
                {dy !== 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute pointer-events-none"
                    style={{
                      inset: -EXPLODE_PX,
                      backgroundColor: 'var(--color-ralph-yellow)',
                      clipPath: faceClipPath('y', dx, dy, EXPLODE_PX, isHovered),
                      transition: faceTransition,
                    }}
                  />
                )}
                {dx !== 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute pointer-events-none"
                    style={{
                      inset: -EXPLODE_PX,
                      backgroundColor: 'var(--color-ralph-yellow)',
                      clipPath: faceClipPath('x', dx, dy, EXPLODE_PX, isHovered),
                      transition: faceTransition,
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className={`${isTouch ? '' : 'group'} relative z-[1] w-full h-full text-left bg-white border-2 border-black overflow-hidden flex flex-col will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ralph-pink`}
                  style={{
                    transform: isHovered
                      ? `translate(${dx * EXPLODE_PX}px, ${dy * EXPLODE_PX}px)`
                      : 'translate(0, 0)',
                    transition: popTransition,
                  }}
                  aria-label={`Open ${item.title ?? 'experiment'}`}
                >
                  <LabCardInner item={item} isLocked={isLocked(item)} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
