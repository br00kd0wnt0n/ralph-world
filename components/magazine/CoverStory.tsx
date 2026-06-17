'use client'

import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import type { ArticleSummary } from '@/lib/data/magazine'
import { canAccess, type AccessTier, type UserTier } from '@/lib/entitlements'

interface CoverStoryProps {
  article: ArticleSummary
  onRead: (slug: string) => void
  onSubscribe: () => void
}

export default function CoverStory({ article, onRead, onSubscribe }: CoverStoryProps) {
  const { user, tier } = useAuth()

  // Access gating — same logic as ArticleOverlay
  const userEntitlement = user ? { tier: (tier ?? 'free') as UserTier } : null
  const articleAccessTier = (article.accessTier ?? 'everyone') as AccessTier
  const canRead = canAccess(userEntitlement, { accessTier: articleAccessTier })

  // Get first tag for the ribbon (if available)
  const ribbonTag = article.contentTags?.[0]

  return (
    <div className="w-full mx-auto px-6 pb-10" style={{ maxWidth: 1040 + 48 }}>
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Image with corner ribbon */}
        <div className="md:w-[45%] relative">
          <div
            className="bg-gray-200 relative"
            style={{ aspectRatio: 1.6290322581, borderRadius: 12 }}
          >
            <img
              src={article.leadMediaUrl || '/imgs/article_lead.png'}
              alt={article.title ?? ''}
              className="w-full h-full object-cover"
              style={{ borderRadius: 12 }}
            />

            {/* Corner ribbon: SVG band at top-left, label rotated along its diagonal */}
            {ribbonTag && (
              <div
                className="absolute pointer-events-none"
                style={{ top: -4, left: -4, width: 140, height: 140 }}
              >
                <img
                  src="/imgs/ribbon.svg"
                  alt=""
                  className="absolute inset-0 w-full h-full"
                />
                <span
                  className="absolute text-white uppercase whitespace-nowrap"
                  style={{
                    top: '37.6%',
                    left: '37.6%',
                    transform: 'translate(-50%, -50%) rotate(-45deg)',
                    fontFamily: "'Gooper Trial', serif",
                    fontWeight: 600,
                    fontSize: 16,
                    lineHeight: 1,
                    letterSpacing: 0,
                  }}
                >
                  {ribbonTag}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="md:w-[55%] flex flex-col justify-start pt-2">
          {/* Category tags as pipe-separated list */}
          {article.contentTags && article.contentTags.length > 0 && (
            <p
              className="uppercase text-black"
              style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 800, fontSize: 12, lineHeight: 1, letterSpacing: 0, marginBottom: 10 }}
            >
              {article.contentTags.join('  |  ')}
            </p>
          )}

          {/* Title first, then subtitle. Intro is intentionally NOT shown
              here — it lives on the article child page only (kept in bold
              there). The cover stays clean: title + kicker. */}
          <h3
            className="text-intro text-black mb-1"
            style={{ fontSize: 18, lineHeight: 1 }}
          >
            {article.title}
          </h3>
          {article.subtitle && (
            <p
              className="text-intro text-black mb-6"
              style={{ fontSize: 18, lineHeight: 1 }}
            >
              {article.subtitle}
            </p>
          )}

          {/* Read button — respects accessTier, same logic as ArticleOverlay */}
          {canRead ? (
            <Button
              label="Read now"
              onClick={() => onRead(article.slug)}
            />
          ) : (
            <Button
              label={user ? 'Upgrade to read' : 'Sign up to read'}
              onClick={onSubscribe}
            />
          )}
        </div>
      </div>
    </div>
  )
}
