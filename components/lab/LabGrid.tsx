'use client'

import { useAuth } from '@/context/AuthContext'
import { isSafeUrl } from '@/lib/safe-url'
import { sanitizeArticleHtml } from '@/lib/sanitize'
import {
  canAccess,
  isPremiumContent,
  type AccessTier,
  type UserTier,
} from '@/lib/entitlements'
import BlockRenderer from '@/components/magazine/BlockRenderer'
import type { LabItem, LabTag } from '@/lib/data/lab'

interface LabGridProps {
  items: LabItem[]
  onSubscribe: () => void
}

// Brand palette. Keys mirror lib/data/lab.ts LabTag color union.
const TAG_PALETTE: Record<LabTag['color'], { bg: string; text: string }> = {
  pink: { bg: '#EA128B', text: '#FFFFFF' },
  yellow: { bg: '#FBC000', text: '#0B0B0B' },
  blue: { bg: '#5FBCBF', text: '#0B0B0B' },
  green: { bg: '#44B758', text: '#0B0B0B' },
  orange: { bg: '#EE6626', text: '#FFFFFF' },
  purple: { bg: '#7B3FE4', text: '#FFFFFF' },
}

export default function LabGrid({ items, onSubscribe }: LabGridProps) {
  const { tier } = useAuth()
  const userEntitlement =
    tier && tier !== 'guest' ? { tier: tier as UserTier } : null

  if (items.length === 0) {
    return (
      <section className="px-6 py-16 text-center">
        <p className="text-secondary">No experiments yet — check back soon.</p>
      </section>
    )
  }

  return (
    <section className="px-6 py-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {items.map((item) => {
          const itemAccessTier = (item.accessTier ?? 'everyone') as AccessTier
          const isLocked = !canAccess(userEntitlement, {
            accessTier: itemAccessTier,
          })
          const isPremium = isPremiumContent(itemAccessTier)
          // BlockRenderer accepts a JSONB-shaped ContentBlock[]; we
          // hand it through unchanged. The component is defensive about
          // unknown block types.
          const blocks = Array.isArray(item.contentBlocks)
            ? (item.contentBlocks as Parameters<typeof BlockRenderer>[0]['blocks'])
            : []
          const tags = Array.isArray(item.tags) ? item.tags : []
          const launchAvailable =
            !isLocked && item.externalUrl && isSafeUrl(item.externalUrl)

          return (
            <article
              key={item.id}
              className="bg-white border-2 border-black rounded-2xl overflow-hidden flex flex-col"
            >
              {/* Lead image */}
              {item.thumbnailUrl && (
                <div className="w-full aspect-[16/10] border-b-2 border-black overflow-hidden bg-surface">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title ?? ''}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 flex flex-col gap-3 flex-1">
                {/* Tags + premium badge */}
                {(tags.length > 0 || isPremium) && (
                  <ul className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 5).map((tag, i) => {
                      const swatch =
                        TAG_PALETTE[tag.color] ?? TAG_PALETTE.pink
                      return (
                        <li
                          key={`${tag.label}-${i}`}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: swatch.bg,
                            color: swatch.text,
                          }}
                        >
                          {tag.label}
                        </li>
                      )
                    })}
                    {isPremium && (
                      <li className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ralph-yellow/90 text-black border border-black/20">
                        ★ Premium
                      </li>
                    )}
                  </ul>
                )}

                {/* Subtitle (eyebrow above headline) */}
                {item.subtitle && (
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ralph-pink">
                    {item.subtitle}
                  </p>
                )}

                {/* Headline */}
                <h2
                  className="text-black"
                  style={{
                    fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                    fontWeight: 600,
                    fontSize: 28,
                    lineHeight: 1.15,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.title}
                </h2>

                {/* Posted by */}
                {item.postedBy && (
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Posted by{' '}
                    <span className="font-semibold text-gray-700">
                      {item.postedBy}
                    </span>
                  </p>
                )}

                {/* Rich-text description */}
                {item.description && (
                  <div
                    className="article-intro text-black [&_p]:mb-3 [&_p:last-child]:mb-0 [&_a]:underline"
                    style={{
                      fontFamily: 'var(--font-body), Arial, sans-serif',
                      fontSize: 15,
                      lineHeight: 1.6,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeArticleHtml(item.description),
                    }}
                  />
                )}

                {/* Inline content blocks (additional images, video, text) */}
                {blocks.length > 0 && (
                  <div
                    className="font-body text-black mt-2"
                    style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.6 }}
                  >
                    <BlockRenderer blocks={blocks} />
                  </div>
                )}

                {/* CTA — pushes to the bottom of the tile */}
                <div className="mt-auto pt-4">
                  {isLocked ? (
                    <button
                      onClick={onSubscribe}
                      className="inline-flex items-center justify-center rounded-full bg-ralph-pink text-white px-5 py-2 text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                    >
                      Subscribe to access →
                    </button>
                  ) : launchAvailable ? (
                    <a
                      href={item.externalUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-ralph-pink text-white px-5 py-2 text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                    >
                      Launch project →
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
