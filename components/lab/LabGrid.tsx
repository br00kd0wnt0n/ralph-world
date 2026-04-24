'use client'

import { motion } from 'framer-motion'
import { labCardVariants } from '@/lib/animation/lab'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useAuth } from '@/context/AuthContext'
import { isSafeUrl } from '@/lib/safe-url'
import type { LabItem } from '@/lib/data/lab'

interface LabGridProps {
  items: LabItem[]
  onSubscribe: () => void
}

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

export default function LabGrid({ items, onSubscribe }: LabGridProps) {
  const { subscriptionStatus } = useAuth()
  const { ref, isVisible } = useScrollReveal(0.05)

  if (items.length === 0) return null

  return (
    <section className="px-6 py-16">
      <div ref={ref} className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-8 font-[family-name:var(--font-display)]">
          All the experiments
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const isLocked =
              item.accessTier === 'paid' && subscriptionStatus !== 'paid'

            return (
              <motion.article
                key={item.id}
                variants={labCardVariants}
                initial="hidden"
                animate={isVisible ? 'visible' : 'hidden'}
                transition={{ delay: i * 0.08 }}
                className="relative bg-surface rounded-xl overflow-hidden border border-border/30 flex flex-col group"
              >
                {/* Badge — fully CMS-controlled. FRESH/NEW/etc. pick the
                    colour; unknown values fall back to pink. */}
                {item.badge && (
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${badgeClasses(item.badge)}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                )}

                {/* Thumbnail */}
                <div className="aspect-video bg-background relative">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title ?? ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                      Thumbnail
                    </div>
                  )}

                  {isLocked && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-ralph-pink/20 flex items-center justify-center text-ralph-pink">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                      </div>
                      <p className="text-white/80 text-xs">Paid subscribers only</p>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-base font-bold text-primary mb-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-secondary mb-4 line-clamp-3 flex-1">
                      {item.description}
                    </p>
                  )}

                  {isLocked ? (
                    <button
                      onClick={onSubscribe}
                      className="self-start text-sm font-medium text-ralph-pink hover:underline"
                    >
                      Subscribe to access &rarr;
                    </button>
                  ) : (
                    item.externalUrl && isSafeUrl(item.externalUrl) && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="self-start text-sm font-medium text-ralph-yellow hover:underline"
                      >
                        Check it out &rarr;
                      </a>
                    )
                  )}
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
