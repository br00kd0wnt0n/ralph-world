'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  gridContainerVariants,
  gridCardVariants,
} from '@/lib/animation/magazine'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { ArticleSummary } from '@/lib/data/magazine'
import type { AccessTier } from '@/lib/entitlements'

interface ArticleGridProps {
  articles: ArticleSummary[]
  onArticleClick: (slug: string) => void
}

// Explode-on-hover: each of the 6 tiles pushes outward from the centre of
// the 3×2 desktop grid by a fixed vector. Locked to 6 tiles per the design.
// Mobile falls back to 2×3 — the vectors are generated for both layouts
// and we switch between them via a resize listener.
const GRID_3x2 = [
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
]
const GRID_2x3 = [
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: 1 },
]
const EXPLODE_PX = 16

// 3D shadow clip-path: only cut corners for diagonal movement
function shadowClipPath(dx: number, dy: number): string {
  // Single-axis movement: no clip needed, just a rectangle
  if (dx === 0 || dy === 0) {
    return 'none'
  }
  // Diagonal movement: cut corners based on direction
  const cutSize = EXPLODE_PX - 1
  const cutTopRightAndBottomLeft = dx * dy > 0
  return cutTopRightAndBottomLeft
    ? `polygon(0 0, calc(100% - ${cutSize}px) 0, 100% ${cutSize}px, 100% 100%, ${cutSize}px 100%, 0 calc(100% - ${cutSize}px))`
    : `polygon(${cutSize}px 0, 100% 0, 100% calc(100% - ${cutSize}px), calc(100% - ${cutSize}px) 100%, 0 100%, 0 ${cutSize}px)`
}

// Placeholder articles for when no data exists
const PLACEHOLDER_ARTICLES: ArticleSummary[] = Array.from({ length: 6 }, (_, i) => ({
  id: `placeholder-${i}`,
  slug: `placeholder-${i}`,
  title: 'Article Title Goes Here',
  subtitle: null,
  intro: 'Brief description of the article content.',
  leadMediaUrl: '/imgs/article_lead.png',
  leadMediaType: null,
  articleType: null,
  contentTags: ['Tag'],
  isCoverStory: false,
  issueNumber: null,
  accessTier: 'free',
  publishedAt: null,
  bylineAuthor: null,
  bylinePhotographer: null,
  backgroundCanvasColour: null,
}))

export default function ArticleGrid({ articles, onArticleClick }: ArticleGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isLargeViewport, setIsLargeViewport] = useState(true)
  const { ref, isVisible } = useScrollReveal(0.05)

  // Use placeholder if no articles
  const displayArticles = articles.length > 0 ? articles : PLACEHOLDER_ARTICLES

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsLargeViewport(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const vectors = isLargeViewport ? GRID_3x2 : GRID_2x3

  // Grid styles shared between shadow and card layers
  const gridStyles = {
    maxWidth: 1168,
    gap: 0,
  }

  return (
    <section className="bg-white px-6 py-0" style={{ marginTop: 20 }}>
      <div className="relative mx-auto" style={{ maxWidth: 1168 }}>
        {/* Black grid lines layer — lowest */}
        <div
          className="absolute grid grid-cols-2 lg:grid-cols-3"
          style={{
            ...gridStyles,
            inset: 0,
            border: '1px solid black',
            backgroundColor: 'black',
            zIndex: 0,
          }}
        >
          {displayArticles.slice(0, 6).map((article) => (
            <div
              key={`grid-${article.id}`}
              style={{ aspectRatio: 1.09604519774 }}
            />
          ))}
        </div>

        {/* Shadow layer — above grid lines, below cards */}
        <div
          className="absolute inset-0 grid grid-cols-2 lg:grid-cols-3 pointer-events-none"
          style={{ ...gridStyles, zIndex: 1 }}
        >
          {displayArticles.slice(0, 6).map((article, i) => {
            const isHovered = hoveredId === article.id
            const vec = vectors[i] ?? { dx: 0, dy: 0 }
            const hoverTransform = isHovered
              ? `translate(${vec.dx * EXPLODE_PX}px, ${vec.dy * EXPLODE_PX}px)`
              : 'translate(0, 0)'
            return (
              <div
                key={`shadow-${article.id}`}
                className="relative"
                style={{ aspectRatio: 1.09604519774 }}
              >
                {/* Shadow is always full size, hidden until hovered */}
                <div
                  className="absolute"
                  style={{
                    // Always extended in opposite direction of movement
                    // For central items (dx=0 or dy=0), use full width/height on that axis
                    top: vec.dy > 0 ? -(EXPLODE_PX - 1) : (vec.dy === 0 ? 0 : 1),
                    bottom: vec.dy < 0 ? -(EXPLODE_PX - 1) : (vec.dy === 0 ? 0 : 1),
                    left: vec.dx > 0 ? -(EXPLODE_PX - 1) : (vec.dx === 0 ? 0 : 1),
                    right: vec.dx < 0 ? -(EXPLODE_PX - 1) : (vec.dx === 0 ? 0 : 1),
                    backgroundColor: 'var(--color-ralph-orange)',
                    clipPath: shadowClipPath(vec.dx, vec.dy),
                    visibility: isHovered ? 'visible' : 'hidden',
                    // Shadow transforms WITH the card
                    transform: hoverTransform,
                    // Show immediately, hide after transform completes
                    transition: isHovered
                      ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s'
                      : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s 0.45s',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Grid lines — absolute positioned lines on top */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          {/* Horizontal line at 50% */}
          <div className="absolute left-0 right-0 h-px bg-black" style={{ top: '50%' }} />
          {/* Vertical line at 33.333% */}
          <div className="absolute top-0 bottom-0 w-px bg-black" style={{ left: '33.333%' }} />
          {/* Vertical line at 66.666% */}
          <div className="absolute top-0 bottom-0 w-px bg-black" style={{ left: '66.666%' }} />
        </div>

        {/* Card layer — above shadows */}
        <motion.div
          ref={ref}
          variants={gridContainerVariants}
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          className="relative grid grid-cols-2 lg:grid-cols-3"
          style={{
            ...gridStyles,
            zIndex: 2,
          }}
        >
          {displayArticles.slice(0, 6).map((article, i) => {
            const isHovered = hoveredId === article.id
            const vec = vectors[i] ?? { dx: 0, dy: 0 }
            const hoverTransform = isHovered
              ? `translate(${vec.dx * EXPLODE_PX}px, ${vec.dy * EXPLODE_PX}px)`
              : 'translate(0, 0)'
            return (
              <div
                key={article.id}
                className="relative"
                style={{ zIndex: isHovered ? 10 : 1 }}
                onMouseEnter={() => setHoveredId(article.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onArticleClick(article.slug)}
              >
                <div
                  className="relative"
                  style={{
                    transform: hoverTransform,
                    transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <motion.article
                    variants={gridCardVariants}
                    className="relative cursor-pointer overflow-hidden block bg-white"
                    style={{ aspectRatio: 1.09604519774 }}
                  >
                    {/* Image fills entire cell */}
                    <div className="absolute inset-0">
                      <img
                        src={article.leadMediaUrl || '/imgs/article_lead.png'}
                        alt={article.title ?? ''}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Access tier badge — always visible, top-left */}
                    {article.accessTier === 'premium' && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-ralph-yellow/90 text-black">
                          ★ Premium
                        </span>
                      </div>
                    )}
                    {(article.accessTier as AccessTier) === 'paid_subscribers' && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-ralph-pink/90 text-white">
                          Subscribers
                        </span>
                      </div>
                    )}

                    {/* Yellow border - appears instantly */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        boxShadow: 'inset 0 0 0 16px var(--color-ralph-yellow)',
                        opacity: isHovered ? 1 : 0,
                      }}
                    />

                    {/* Info overlay - inside the border, fades in */}
                    <div
                      className={`absolute pointer-events-none transition-opacity duration-300 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        top: 16,
                        left: 16,
                        right: 16,
                        bottom: 16,
                      }}
                    >
                      {/* Gradient at bottom, inside the border */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pt-16">
                        {/* Category tags */}
                        {article.contentTags && article.contentTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {article.contentTags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] font-bold uppercase tracking-wide text-ralph-pink"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <h3 className="text-sm md:text-base font-bold text-white leading-tight mb-1">
                          {article.title}
                        </h3>

                        {article.intro && (
                          <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                            {article.intro}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.article>
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
