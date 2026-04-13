'use client'

import { useState } from 'react'
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

export default function ArticleGrid({ articles, onArticleClick }: ArticleGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const { ref, isVisible } = useScrollReveal(0.05)

  return (
    <section className="bg-[#FAFAFA] px-6 py-0">
      <motion.div
        ref={ref}
        variants={gridContainerVariants}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-3 border border-gray-900"
      >
        {articles.map((article) => {
          const isHovered = hoveredId === article.id
          return (
            <motion.article
              key={article.id}
              variants={gridCardVariants}
              className="relative cursor-pointer border border-gray-900 aspect-square overflow-hidden"
              onMouseEnter={() => setHoveredId(article.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onArticleClick(article.slug)}
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
                      {article.issueNumber && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-ralph-orange">
                          Issue #{article.issueNumber}
                        </span>
                      )}
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
          )
        })}
      </motion.div>
    </section>
  )
}
