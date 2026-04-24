'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  gridContainerVariants,
  gridCardVariants,
} from '@/lib/animation/magazine'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { ArticleSummary } from '@/lib/data/magazine'

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

export default function ArticleGrid({ articles, onArticleClick }: ArticleGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isLargeViewport, setIsLargeViewport] = useState(true)
  const { ref, isVisible } = useScrollReveal(0.05)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsLargeViewport(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const vectors = isLargeViewport ? GRID_3x2 : GRID_2x3

  return (
    <section className="bg-[#FAFAFA] px-6 py-0">
      <motion.div
        ref={ref}
        variants={gridContainerVariants}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-3 border border-gray-900"
      >
        {articles.slice(0, 6).map((article, i) => {
          const isHovered = hoveredId === article.id
          const vec = vectors[i] ?? { dx: 0, dy: 0 }
          // motion.article below owns `transform` for its entry animation
          // (y:20→0), so the hover offset lives on an outer wrapper div.
          // Same element would mean framer-motion overwrites the hover.
          const hoverTransform = isHovered
            ? `translate(${vec.dx * EXPLODE_PX}px, ${vec.dy * EXPLODE_PX}px) scale(1.04)`
            : 'translate(0, 0) scale(1)'
          return (
            <div
              key={article.id}
              className="relative"
              style={{
                transform: hoverTransform,
                transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                zIndex: isHovered ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredId(article.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onArticleClick(article.slug)}
            >
            <motion.article
              variants={gridCardVariants}
              className="relative cursor-pointer border border-gray-900 aspect-square overflow-hidden block"
            >
              {/* Image fills entire cell */}
              <div className="absolute inset-0">
                {article.leadMediaUrl ? (
                  <img
                    src={article.leadMediaUrl}
                    alt={article.title ?? ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>

              {/* Hover reveal: decorative border + article info overlay */}
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* Yellow dotted border frame */}
                <div className="absolute inset-2 border-2 border-dashed border-ralph-yellow rounded-sm pointer-events-none" />

                {/* Info overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pt-16">
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
          )
        })}
      </motion.div>
    </section>
  )
}
