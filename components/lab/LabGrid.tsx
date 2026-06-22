'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperClass } from 'swiper/types'
import 'swiper/css'
import { useAuth } from '@/context/AuthContext'
import { isSafeUrl } from '@/lib/safe-url'
import { canAccess, isPremiumContent, type AccessTier, type UserTier } from '@/lib/entitlements'
import type { LabItem } from '@/lib/data/lab'

interface LabGridProps {
  items: LabItem[]
  onSubscribe: () => void
}

/**
 * Thought-bubble trail tuning. The 3 circles are interpolated between the
 * character's forehead (a FIXED screen point, since the character is pinned to
 * the bottom of the viewport) and the cloud's CURRENT on-screen position.
 * Scrolled down → cloud is far up → wide gap → circles spread out.
 * Scrolled up   → cloud drops closer → narrow gap → circles bunch up / flatten.
 */
const CHARACTER_WIDTH = 412 // px
const CHARACTER_OFFSET_X = -440 // px from viewport centre at full scroll (rest position)
const CHARACTER_TOP_SHIFT = -150 // extra px to the left when scrolled to the top
const FOREHEAD_X = 175 // px from the character's own left edge
const FOREHEAD_FROM_BOTTOM = 300 // px up from the bottom of the screen
const CLOUD_ANCHOR_X = 0.24 // fraction across the cloud where the trail meets it
const CLOUD_ANCHOR_Y = 0.82 // fraction down the cloud where the trail meets it
// t = position along the forehead→cloud line (0 = forehead, 1 = cloud); d = diameter;
// dx/dy = optional px nudge off the line (e.g. to fine-tune individual circles)
const BUBBLES = [
  { t: 0.32, d: 22, dx: 0, dy: 0 },
  { t: 0.58, d: 34, dx: 0, dy: 0 },
  { t: 0.82, d: 51, dx: -90, dy: 0 },
]

// CTA link — pink, in the title's Gooper face (weight 600)
const ctaStyle: React.CSSProperties = {
  fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
  fontWeight: 600,
  fontSize: 18,
  letterSpacing: 0,
}

// Glass interior of the jar that the thumbnail is masked into. jar-mask.svg is
// 149.76×166.78 within the 201.4×234.3 jar (~74% × ~71%). Nudge to taste.
const JAR_GLASS = { top: '1.3%', left: '9%', width: '75.1%', height: '75%' }

function badgeClasses(badge: string) {
  switch (badge.toUpperCase()) {
    case 'FRESH':
      return 'bg-ralph-yellow text-black'
    case 'NEW':
      return 'bg-ralph-teal text-black'
    default:
      return 'bg-ralph-pink text-white'
  }
}

/**
 * Bell-jar slide content. The experiment thumbnail sits inside the glass
 * dome of bell-jar.svg; the jar art (white glass + black outline + base)
 * renders on top of the thumbnail's outer edges via the inset below, so the
 * black rim stays visible around the thumbnail.
 */
function BellJar({ item }: { item: LabItem }) {
  return (
    // Jar intrinsic ratio 201.4 × 234.3
    <div className="relative w-[201px] max-[575px]:w-[174px] mx-auto" style={{ aspectRatio: '201.4 / 234.3' }}>
      {/* Jar illustration (white glass + outline + base) underneath */}
      <img
        src="/imgs/bell-jar.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
      />

      {/* Thumbnail masked to the jar's glass interior via jar-mask.svg */}
      <div
        className="absolute"
        style={{
          top: JAR_GLASS.top,
          left: JAR_GLASS.left,
          width: JAR_GLASS.width,
          height: JAR_GLASS.height,
          maskImage: 'url(/imgs/jar-mask.svg)',
          maskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskImage: 'url(/imgs/jar-mask.svg)',
          WebkitMaskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
        }}
      >
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title ?? ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-ralph-pink/20" />
        )}
      </div>
    </div>
  )
}

export default function LabGrid({ items, onSubscribe }: LabGridProps) {
  const { tier } = useAuth()
  const swiperRef = useRef<SwiperClass | null>(null)
  const cloudRef = useRef<HTMLDivElement | null>(null)
  const bubbleRefs = useRef<Array<HTMLDivElement | null>>([])
  const characterRef = useRef<HTMLImageElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  // Portal target only exists after mount (no document during SSR).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Re-position the thought-bubble circles between the character's forehead
  // and the cloud as the page scrolls (rAF-batched, transform-only).
  useEffect(() => {
    if (!mounted) return
    let raf = 0
    const update = () => {
      raf = 0
      const cloud = cloudRef.current
      if (!cloud) return
      const rect = cloud.getBoundingClientRect()
      // Interpolate character X: rest at full scroll, shifted left at top.
      // scrollProgress: 0 = top, 1 = bottom of page.
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      )
      const scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll))
      const charOffsetX = CHARACTER_OFFSET_X + CHARACTER_TOP_SHIFT * (1 - scrollProgress)
      if (characterRef.current) {
        characterRef.current.style.transform = `translateX(calc(-50% + ${charOffsetX}px))`
      }
      // Character is centred then shifted: left edge = vw/2 - width/2 + offset.
      const charLeft = window.innerWidth / 2 - CHARACTER_WIDTH / 2 + charOffsetX
      const fx = charLeft + FOREHEAD_X
      const fy = window.innerHeight - FOREHEAD_FROM_BOTTOM
      const cx = rect.left + rect.width * CLOUD_ANCHOR_X
      const cy = rect.top + rect.height * CLOUD_ANCHOR_Y
      // Centre of each circle along the forehead→cloud line (+ per-circle nudge)
      const centers = BUBBLES.map((b) => ({
        x: fx + (cx - fx) * b.t + b.dx,
        y: fy + (cy - fy) * b.t + b.dy,
      }))
      // Middle circle sits exactly between the outer two (then its own nudge)
      centers[1] = {
        x: (centers[0].x + centers[2].x) / 2 + BUBBLES[1].dx,
        y: (centers[0].y + centers[2].y) / 2 + BUBBLES[1].dy,
      }
      BUBBLES.forEach((b, i) => {
        const el = bubbleRefs.current[i]
        if (!el) return
        el.style.transform = `translate(${centers[i].x - b.d / 2}px, ${centers[i].y - b.d / 2}px)`
      })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [mounted])

  if (items.length === 0) return null

  const showNav = items.length > 1
  const userEntitlement = tier && tier !== 'guest' ? { tier: tier as UserTier } : null

  return (
    <section className="px-0 min-[768px]:px-6 py-16 flex flex-col items-center overflow-x-clip">
      {/* ── Cloud stage: conveyor belt + bell-jar carousel ──
          < 768: a SET 612px width (bleeds off the screen sides, clipped by the
          section's overflow-x-clip) so the cloud/jars don't scale with the
          viewport and the fixed-size jars stay in position.
          >= 768: fluid up to 612. */}
      <div
        ref={cloudRef}
        className="relative w-[612px] min-[768px]:w-full"
        style={{ maxWidth: 612, aspectRatio: '612 / 419' }}
      >
        <img
          src="/imgs/labs-cloud.svg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
        />

        {/* Conveyor belt the jars sit on */}
        <img
          src="/imgs/conveyor-belt.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 z-0 max-w-full pointer-events-none select-none bottom-[7%] max-[575px]:bottom-[calc(7%_+_30px)]"
          style={{ width: 584 }}
        />

        {/* Cloud-shaped mask (612×419, matches the cloud) clipping the jars to
            the cloud silhouette so side-peeking slides don't spill out. */}
        <div
          className="absolute inset-0 z-10"
          style={{
            maskImage: 'url(/imgs/labs-cloud-mask.svg)',
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: 'url(/imgs/labs-cloud-mask.svg)',
            WebkitMaskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
          }}
        >
          {/* Jars — centered carousel with side-peek. Sit a little lower on
              mobile (translate-y) than desktop. */}
          <div
            className="absolute left-0 right-0 translate-y-[40px] min-[576px]:max-[767px]:translate-y-[39px] max-[575px]:translate-y-[39px]"
            style={{ top: '14%', bottom: '24%' }}
          >
            <Swiper
              onSwiper={(s) => { swiperRef.current = s }}
              onSlideChange={(s) => setActiveIndex(s.realIndex)}
              loop={showNav}
              centeredSlides
              slidesPerView={1}
              breakpoints={{ 768: { slidesPerView: 2.2 } }}
              speed={400}
              className="w-full h-full"
            >
              {items.map((item) => (
                <SwiperSlide key={item.id} className="flex items-end justify-center">
                  <BellJar item={item} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        {showNav && (
          <>
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-black text-white hover:bg-black/80"
              style={{ width: 30, height: 30, left: 'max(24px, calc(50% - 50vw + 24px))' }}
              aria-label="Previous"
            >
              <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                <path d="M8 1L2 7L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-black text-white hover:bg-black/80"
              style={{ width: 30, height: 30, right: 'max(24px, calc(50% - 50vw + 24px))' }}
              aria-label="Next"
            >
              <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                <path d="M2 1L8 7L2 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Experiment info (below the cloud) ── */}
      {/* Every entry shares one CSS grid cell, so the block's height stays
          fixed to the tallest entry — no resize jolt between slides. Only the
          active entry is opaque; the rest crossfade out. */}
      <div className="mt-6 max-w-sm grid text-center px-6">
        {items.map((item, i) => {
          const itemAccessTier = (item.accessTier ?? 'everyone') as AccessTier
          const isLocked = !canAccess(userEntitlement, { accessTier: itemAccessTier })
          const isPremium = isPremiumContent(itemAccessTier)
          const isActive = i === activeIndex
          return (
            <div
              key={item.id}
              aria-hidden={!isActive}
              className="transition-opacity duration-300 ease-in-out"
              style={{
                gridArea: '1 / 1',
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <div className="flex gap-1.5 justify-center mb-2">
                {item.badge && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${badgeClasses(item.badge)}`}>
                    {item.badge}
                  </span>
                )}
                {isPremium && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-ralph-yellow/90 text-black">
                    ★ Premium
                  </span>
                )}
              </div>

              <h3
                className="text-black mb-2"
                style={{
                  fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                  fontWeight: 600,
                  fontSize: 22,
                  lineHeight: 1,
                  letterSpacing: 0,
                }}
              >
                {item.title}
              </h3>

              {item.description && (
                <p
                  className="text-black mb-4"
                  style={{
                    fontFamily: 'var(--font-body), Arial, sans-serif',
                    fontWeight: 600,
                    fontSize: 16,
                    lineHeight: '30px',
                    letterSpacing: 0,
                  }}
                >
                  {item.description}
                </p>
              )}

              {isLocked ? (
                <button
                  onClick={onSubscribe}
                  className="text-ralph-pink hover:underline"
                  style={ctaStyle}
                  tabIndex={isActive ? 0 : -1}
                >
                  Subscribe to access &rarr;
                </button>
              ) : (
                item.externalUrl &&
                isSafeUrl(item.externalUrl) && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ralph-pink hover:underline"
                    style={ctaStyle}
                    tabIndex={isActive ? 0 : -1}
                  >
                    Check it out &rarr;
                  </a>
                )
              )}
            </div>
          )
        })}
      </div>

      {/* Lab character + thought-bubble trail — portaled to <body> so they
          escape <main>'s stacking context and can paint over the footer.
          Full-screen fixed overlay at z-30 (above footer z-10, below nav z-50);
          pointer-events-none so it never blocks the page. */}
      {mounted &&
        createPortal(
          <div
            className="fixed inset-0 pointer-events-none select-none hidden min-[768px]:block"
            style={{ zIndex: 30 }}
            aria-hidden="true"
          >
            {/* Thought-bubble circles (positioned by the scroll effect) */}
            {BUBBLES.map((b, i) => (
              <div
                key={i}
                ref={(el) => {
                  bubbleRefs.current[i] = el
                }}
                className="absolute top-0 left-0 rounded-full"
                style={{
                  width: b.d,
                  height: b.d,
                  backgroundColor: '#FBC000',
                  willChange: 'transform',
                }}
              />
            ))}

            {/* Character pinned to the bottom of the screen, centred then
                shifted left (matches the forehead maths in the scroll effect). */}
            <img
              ref={characterRef}
              src="/imgs/labs-character.svg"
              alt=""
              className="absolute bottom-0"
              style={{
                left: '50%',
                transform: `translateX(calc(-50% + ${CHARACTER_OFFSET_X + CHARACTER_TOP_SHIFT}px))`,
                width: CHARACTER_WIDTH,
                height: 'auto',
                willChange: 'transform',
              }}
            />
          </div>,
          document.body
        )}
    </section>
  )
}
