'use client'

import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { overlayContentVariants } from '@/lib/animation/magazine'
import { useAuth } from '@/context/AuthContext'
import BlockRenderer from '@/components/magazine/BlockRenderer'
import { isSafeUrl } from '@/lib/safe-url'
import { sanitizeArticleHtml } from '@/lib/sanitize'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import {
  canAccess,
  isPremiumContent,
  type AccessTier,
  type UserTier,
} from '@/lib/entitlements'
import type { LabItem, LabTag } from '@/lib/data/lab'

interface LabOverlayProps {
  item: LabItem | null
  isOpen: boolean
  onClose: () => void
  onSubscribe: () => void
}

const TAG_PALETTE: Record<LabTag['color'], { bg: string; text: string }> = {
  pink: { bg: '#EA128B', text: '#FFFFFF' },
  yellow: { bg: '#FBC000', text: '#0B0B0B' },
  blue: { bg: '#5FBCBF', text: '#0B0B0B' },
  green: { bg: '#44B758', text: '#0B0B0B' },
  orange: { bg: '#EE6626', text: '#FFFFFF' },
  purple: { bg: '#7B3FE4', text: '#FFFFFF' },
}

export default function LabOverlay({
  item,
  isOpen,
  onClose,
  onSubscribe,
}: LabOverlayProps) {
  const { tier } = useAuth()
  const [mounted, setMounted] = useState(false)
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen)

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleEsc)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, handleEsc])

  if (!mounted || !item) return null

  const userEntitlement =
    tier && tier !== 'guest' ? { tier: tier as UserTier } : null
  const itemAccessTier = (item.accessTier ?? 'everyone') as AccessTier
  const isLocked = !canAccess(userEntitlement, { accessTier: itemAccessTier })
  const isPremium = isPremiumContent(itemAccessTier)
  const tags = Array.isArray(item.tags) ? item.tags : []
  const blocks = Array.isArray(item.contentBlocks)
    ? (item.contentBlocks as Parameters<typeof BlockRenderer>[0]['blocks'])
    : []
  const launchAvailable =
    !isLocked && item.externalUrl && isSafeUrl(item.externalUrl)

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-black/70 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={item.title ?? 'Lab experiment'}
        >
          <div className="min-h-full flex items-start justify-center py-10 px-4 md:px-8">
            <div
              ref={trapRef}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[920px] bg-white border-2 border-black rounded-2xl overflow-hidden"
            >
              {/* Close */}
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-ralph-pink transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1L13 13M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <motion.div
                variants={overlayContentVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Lead image */}
                {item.thumbnailUrl && (
                  <div className="w-full aspect-[16/9] border-b-2 border-black overflow-hidden">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title ?? ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="px-6 md:px-12 py-8 md:py-12 max-w-[720px] mx-auto">
                  {/* Tags + premium badge */}
                  {(tags.length > 0 || isPremium) && (
                    <ul className="flex flex-wrap gap-1.5 mb-5">
                      {tags.slice(0, 5).map((tag, i) => {
                        const swatch =
                          TAG_PALETTE[tag.color] ?? TAG_PALETTE.pink
                        return (
                          <li
                            key={`${tag.label}-${i}`}
                            className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
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
                        <li className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-ralph-yellow/90 text-black border border-black/20">
                          ★ Premium
                        </li>
                      )}
                    </ul>
                  )}

                  {/* Subtitle eyebrow */}
                  {item.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-ralph-pink mb-3">
                      {item.subtitle}
                    </p>
                  )}

                  {/* Headline */}
                  <h1
                    className="text-black mb-3"
                    style={{
                      fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
                      fontWeight: 600,
                      fontSize: 40,
                      lineHeight: 1.1,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </h1>

                  {/* Posted by */}
                  {item.postedBy && (
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-6">
                      Posted by{' '}
                      <span className="font-semibold text-gray-700">
                        {item.postedBy}
                      </span>
                    </p>
                  )}

                  <div className="w-[80px] h-[2px] bg-black mb-6" />

                  {/* Rich-text description (intro) */}
                  {item.description && (
                    <div
                      className="article-intro text-black mb-6 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_a]:underline"
                      style={{
                        fontFamily: "'Gooper Trial', serif",
                        fontSize: 18,
                        lineHeight: 1.55,
                        fontWeight: 500,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeArticleHtml(item.description),
                      }}
                    />
                  )}

                  {/* Content blocks */}
                  {blocks.length > 0 && (
                    <div
                      className="font-body text-black mt-6"
                      style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.65 }}
                    >
                      <BlockRenderer blocks={blocks} />
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-10">
                    {isLocked ? (
                      <button
                        onClick={onSubscribe}
                        className="inline-flex items-center justify-center rounded-full bg-ralph-pink text-white px-6 py-2.5 text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                      >
                        Subscribe to access →
                      </button>
                    ) : launchAvailable ? (
                      <a
                        href={item.externalUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-ralph-pink text-white px-6 py-2.5 text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                      >
                        Launch project →
                      </a>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(overlay, document.body)
}
