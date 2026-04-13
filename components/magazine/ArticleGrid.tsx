'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  gridContainerVariants,
  gridCardVariants,
  clawVariants,
  grabbedCardVariants,
  clawPreviewVariants,
} from '@/lib/animation/magazine'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { ArticleSummary } from '@/lib/data/magazine'

interface ArticleGridProps {
  articles: ArticleSummary[]
  onArticleClick: (slug: string) => void
}

export default function ArticleGrid({ articles, onArticleClick }: ArticleGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const { ref, isVisible } = useScrollReveal(0.05)
  const hoveredArticle = articles.find((a) => a.id === hoveredId)

  return (
    <section className="bg-[#FAFAFA] px-6 py-8 relative">
      {/* Claw — appears above grid when hovering a card */}
      <AnimatePresence>
        {hoveredArticle && (
          <>
            {/* Claw arm */}
            <motion.div
              variants={clawVariants}
              initial="idle"
              animate="descending"
              exit="retracting"
              className="fixed top-0 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
            >
              {/* Claw placeholder — Duffy SVG at /public/illustrations/claw.svg */}
              <div className="w-16 h-32 bg-gray-400/20 rounded-b-xl mx-auto flex items-end justify-center pb-2 text-[8px] text-gray-400">
                claw
              </div>

              {/* Preview card held by claw */}
              <motion.div
                variants={clawPreviewVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-56 bg-white rounded-xl shadow-xl p-4 mx-auto origin-top"
              >
                {hoveredArticle.issueNumber && (
                  <p className="text-[10px] text-ralph-orange font-medium mb-1">
                    Issue #{hoveredArticle.issueNumber}
                  </p>
                )}
                <p className="text-sm font-bold text-black line-clamp-2 mb-1">
                  {hoveredArticle.title}
                </p>
                {hoveredArticle.intro && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {hoveredArticle.intro}
                  </p>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        ref={ref}
        variants={gridContainerVariants}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {articles.map((article) => {
          const isHovered = hoveredId === article.id
          return (
            <motion.article
              key={article.id}
              variants={gridCardVariants}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredId(article.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onArticleClick(article.slug)}
            >
              <motion.div
                variants={grabbedCardVariants}
                animate={isHovered ? 'lifted' : 'resting'}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="aspect-[3/2] bg-ralph-orange/10 relative">
                  {article.leadMediaUrl ? (
                    <img
                      src={article.leadMediaUrl}
                      alt={article.title ?? ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                      Thumbnail
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {article.issueNumber && (
                    <p className="text-[10px] text-ralph-orange font-medium mb-1">
                      Issue #{article.issueNumber}
                    </p>
                  )}
                  <h3 className="text-sm font-bold text-black line-clamp-2 mb-1">
                    {article.title}
                  </h3>
                  {article.intro && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {article.intro}
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.article>
          )
        })}
      </motion.div>
    </section>
  )
}
