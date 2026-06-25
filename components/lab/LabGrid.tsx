'use client'

import { useAuth } from '@/context/AuthContext'
import {
  canAccess,
  isPremiumContent,
  type AccessTier,
  type UserTier,
} from '@/lib/entitlements'
import type { LabItem, LabTag } from '@/lib/data/lab'

interface LabGridProps {
  items: LabItem[]
  onItemClick: (item: LabItem) => void
}

const TAG_PALETTE: Record<LabTag['color'], { bg: string; text: string }> = {
  pink: { bg: '#EA128B', text: '#FFFFFF' },
  yellow: { bg: '#FBC000', text: '#0B0B0B' },
  blue: { bg: '#5FBCBF', text: '#0B0B0B' },
  green: { bg: '#44B758', text: '#0B0B0B' },
  orange: { bg: '#EE6626', text: '#FFFFFF' },
  purple: { bg: '#7B3FE4', text: '#FFFFFF' },
}

/** Strip HTML + truncate. Used to derive a plain-text teaser from the
 *  Tiptap-authored description without rendering its tags inside a card. */
function teaser(html: string | null, max = 160): string {
  if (!html) return ''
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}

export default function LabGrid({ items, onItemClick }: LabGridProps) {
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
          const tags = Array.isArray(item.tags) ? item.tags : []

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick(item)}
              className="group text-left bg-white border-2 border-black rounded-2xl overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ralph-pink focus-visible:ring-offset-2"
              aria-label={`Open ${item.title ?? 'experiment'}`}
            >
              {/* Lead image */}
              {item.thumbnailUrl && (
                <div className="w-full aspect-[16/10] border-b-2 border-black overflow-hidden bg-surface">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title ?? ''}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              )}

              <div className="p-6 flex flex-col gap-3 flex-1">
                {(tags.length > 0 || isPremium || isLocked) && (
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

                {item.subtitle && (
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ralph-pink">
                    {item.subtitle}
                  </p>
                )}

                <h2
                  className="text-black"
                  style={{
                    fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                    fontWeight: 600,
                    fontSize: 26,
                    lineHeight: 1.15,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.title}
                </h2>

                {item.postedBy && (
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Posted by{' '}
                    <span className="font-semibold text-gray-700">
                      {item.postedBy}
                    </span>
                  </p>
                )}

                {/* Plain-text teaser — sanitised at render-time by stripping
                    tags so card layout stays predictable regardless of what
                    the editor put in the rich-text intro. Full HTML is in
                    the overlay. */}
                {item.description && (
                  <p
                    className="text-black/80"
                    style={{
                      fontFamily: 'var(--font-body), Arial, sans-serif',
                      fontSize: 14,
                      lineHeight: 1.55,
                    }}
                  >
                    {teaser(item.description)}
                  </p>
                )}

                <div className="mt-auto pt-3">
                  <span className="inline-flex items-center text-ralph-pink text-sm font-bold uppercase tracking-wider">
                    {isLocked ? 'Subscribe to access' : 'Read more'} →
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
