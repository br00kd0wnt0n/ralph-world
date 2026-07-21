'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isSafeUrl } from '@/lib/safe-url'
import type { CaseStudyMedia } from '@/lib/data/case-studies'

interface Props {
  items: CaseStudyMedia[]
  anchorSide?: 'left' | 'right'
}

/**
 * Multi-image carousel ported from the standalone viewer's
 * ImageCarousel. Stacked-card design: the active card sits on top,
 * the others peek out behind, and you swipe (or arrow) between them.
 *
 * Kept as a client component and lazy-only-when-needed — server
 * components render single media inline; carousel only mounts when a
 * section has 2+ items.
 */
export default function CaseStudyCarousel({ items, anchorSide = 'right' }: Props) {
  const safeItems = items.filter((m) => m.url && isSafeUrl(m.url))
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; time: number } | null>(null)
  const [containerHeight, setContainerHeight] = useState<number>(320)

  const total = safeItems.length
  const canPrev = activeIndex > 0
  const canNext = activeIndex < total - 1
  const isLeft = anchorSide === 'left'

  const goTo = useCallback(
    (idx: number) => {
      setActiveIndex(Math.max(0, Math.min(total - 1, idx)))
      setDragX(0)
    },
    [total]
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [items.length])

  function onPointerDown(e: React.PointerEvent) {
    if (total <= 1) return
    dragStartRef.current = { x: e.clientX, time: Date.now() }
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStartRef.current || !dragging) return
    setDragX(e.clientX - dragStartRef.current.x)
  }
  function onPointerUp() {
    if (!dragStartRef.current) return
    const dx = dragX
    const elapsed = Date.now() - dragStartRef.current.time
    const velocity = Math.abs(dx) / Math.max(elapsed, 1)
    // Same thresholds as the viewer — a fast flick counts even if the
    // absolute pixel distance is small.
    if (dx < -50 || (dx < -20 && velocity > 0.3)) {
      if (canNext) goTo(activeIndex + 1)
    } else if (dx > 50 || (dx > 20 && velocity > 0.3)) {
      if (canPrev) goTo(activeIndex - 1)
    }
    dragStartRef.current = null
    setDragging(false)
    setDragX(0)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft' && canPrev) goTo(activeIndex - 1)
    if (e.key === 'ArrowRight' && canNext) goTo(activeIndex + 1)
  }

  // The stack area is absolute-positioned, so it needs an explicit
  // height. When the active image loads we measure its natural aspect
  // ratio against the container width and grow the stack to match.
  function onActiveImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    if (!img.naturalWidth) return
    const width = containerRef.current?.clientWidth ?? 480
    setContainerHeight(width * (img.naturalHeight / img.naturalWidth))
  }

  if (total === 0) return null
  // Single-item: render directly, no carousel chrome. (Callers can
  // still hand us a 1-item array without special-casing.)
  if (total === 1) {
    return <SingleMedia item={safeItems[0]} />
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative outline-none"
    >
      <div
        className="relative touch-pan-y cursor-grab active:cursor-grabbing select-none"
        style={{ minHeight: 200, height: containerHeight }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {safeItems.map((item, i) => {
          const offset = i - activeIndex
          const isActive = offset === 0
          const depth = Math.min(Math.abs(offset), 3)
          const translateX = isActive ? (dragging ? dragX : 0) : depth * 12
          const translateY = isActive ? 0 : depth * -8
          const scale = isActive ? 1 : 1 - depth * 0.04
          const opacity = isActive ? 1 : Math.max(0, 1 - depth * 0.25)
          const rotate = isActive
            ? dragging
              ? dragX * 0.03
              : 0
            : depth * (isLeft ? -1.5 : 1.5)
          const zIndex = total - Math.abs(offset)
          const kind = mediaKind(item)

          return (
            <div
              key={item.id ?? `${i}-${item.url}`}
              className="absolute inset-x-0 top-0 rounded-lg overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] will-change-transform"
              style={{
                transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                opacity,
                zIndex,
                transition:
                  dragging && isActive
                    ? 'none'
                    : 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              {kind === 'video' ? (
                <video
                  src={item.url}
                  muted
                  loop
                  playsInline
                  autoPlay={isActive}
                  className="block w-full h-auto object-cover pointer-events-none select-none"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.alt ?? ''}
                  draggable={false}
                  onLoad={i === activeIndex ? onActiveImageLoad : undefined}
                  className="block w-full h-auto object-cover pointer-events-none select-none"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => canPrev && goTo(activeIndex - 1)}
          disabled={!canPrev}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/80 hover:text-white transition disabled:opacity-30 disabled:cursor-default"
          aria-label="Previous"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          {safeItems.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2 h-2 rounded-full border transition ${
                i === activeIndex
                  ? 'bg-white/80 border-white/40 scale-125'
                  : 'bg-white/20 border-white/15 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => canNext && goTo(activeIndex + 1)}
          disabled={!canNext}
          className="w-9 h-9 flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/80 hover:text-white transition disabled:opacity-30 disabled:cursor-default"
          aria-label="Next"
        >
          →
        </button>
      </div>
      <div className="mt-2 text-center text-[11px] tracking-widest text-white/40 font-mono">
        {activeIndex + 1} / {total}
      </div>
    </div>
  )
}

function SingleMedia({ item }: { item: CaseStudyMedia }) {
  const kind = mediaKind(item)
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      {kind === 'video' ? (
        <video
          src={item.url}
          muted
          loop
          playsInline
          autoPlay
          controls
          className="block w-full h-auto bg-black"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.alt ?? ''}
          className="block w-full h-auto object-cover"
          loading="lazy"
        />
      )}
    </div>
  )
}

function mediaKind(m: CaseStudyMedia): 'video' | 'image' {
  if (m.type === 'video') return 'video'
  const url = m.url ?? ''
  if (/\.(mp4|mov|webm)(?:$|\?)/i.test(url)) return 'video'
  return 'image'
}
