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

// 3D extrusion faces. Each tile may show up to two faces (one horizontal,
// one vertical) depending on its position. Faces are absolutely positioned
// over the cell with `inset: -K` so coordinates address a box K-pixels
// larger than the cell on every side:
//   cell top-left      → (K, K)
//   cell bottom-right  → (100% - K, 100% - K)
//   moved card corners → cell corners shifted by (dx*K, dy*K)
// At rest the quadrilateral collapses onto the cell edge (zero area);
// on hover it expands to a trapezoid connecting the cell edge to the
// moved card edge, simulating an extruded 3D side.
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

  // Moved card edges (cell shifted by dx*K, dy*K)
  const mvdL = px((1 + dx) * K)
  const mvdR = calc((1 - dx) * K)
  const mvdT = px((1 + dy) * K)
  const mvdB = calc((1 - dy) * K)

  // Faces render OPPOSITE to the direction of movement: if the card lifts
  // up-left, the bottom + right faces of the extruded block are exposed.
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

// Placeholder articles for when no data exists
const PLACEHOLDER_ARTICLES: ArticleSummary[] = Array.from({ length: 6 }, (_, i) => ({
  id: `placeholder-${i}`,
  slug: `placeholder-${i}`,
  title: 'Article Title Goes Here',
  subtitle: null,
  intro: 'Brief description of the article content.',
  leadMediaUrl: '/imgs/article_lead.png',
  leadMediaType: null,
  cardImageUrl: null,
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
        {/* Black grid background — lowest */}
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

        {/* Extrusion faces layer — below cards.
            Each tile renders up to two trapezoidal faces (horizontal + vertical)
            that stay anchored at the resting cell edge. The clip-path animates
            from a collapsed edge to a quadrilateral whose far edge tracks the
            card's hovered position — simulating an extruded 3D block side. */}
        <div
          className="absolute inset-0 grid grid-cols-2 lg:grid-cols-3 pointer-events-none"
          style={{ ...gridStyles, zIndex: 11 }}
        >
          {displayArticles.slice(0, 6).map((article, i) => {
            const isHovered = hoveredId === article.id
            const vec = vectors[i] ?? { dx: 0, dy: 0 }
            const faceTransition =
              'clip-path 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
            return (
              <div
                key={`shadow-${article.id}`}
                className="relative"
                style={{ aspectRatio: 1.09604519774 }}
              >
                {vec.dy !== 0 && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: -EXPLODE_PX,
                      backgroundColor: 'var(--color-ralph-orange)',
                      clipPath: faceClipPath(
                        'y',
                        vec.dx,
                        vec.dy,
                        EXPLODE_PX,
                        isHovered,
                      ),
                      transition: faceTransition,
                    }}
                  />
                )}
                {vec.dx !== 0 && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: -EXPLODE_PX,
                      backgroundColor: 'var(--color-ralph-orange)',
                      clipPath: faceClipPath(
                        'x',
                        vec.dx,
                        vec.dy,
                        EXPLODE_PX,
                        isHovered,
                      ),
                      transition: faceTransition,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Card layer — above extrusion faces */}
        <motion.div
          ref={ref}
          variants={gridContainerVariants}
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          className="relative grid grid-cols-2 lg:grid-cols-3"
          style={{
            ...gridStyles,
            zIndex: 12,
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
                        src={article.cardImageUrl || article.leadMediaUrl || '/imgs/article_lead.png'}
                        alt={article.title ?? ''}
                        draggable={false}
                        className="w-full h-full object-cover select-none"
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

                        {article.subtitle && (
                          <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                            {article.subtitle}
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
