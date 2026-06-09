'use client'

import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { overlayVariants, overlayContentVariants } from '@/lib/animation/magazine'
import { useAuth } from '@/context/AuthContext'
import BlockRenderer from './BlockRenderer'
import type { ArticleFull } from '@/lib/data/magazine'
import { resolveTheme } from '@/lib/article-themes'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { canAccess, isPremiumContent, type AccessTier, type UserTier } from '@/lib/entitlements'

interface ArticleOverlayProps {
  article: ArticleFull | null
  isOpen: boolean
  onClose: () => void
  onSubscribe: () => void
}

export default function ArticleOverlay({
  article,
  isOpen,
  onClose,
  onSubscribe,
}: ArticleOverlayProps) {
  const { user, tier } = useAuth()
  const [mounted, setMounted] = useState(false)

  // All hooks must run unconditionally before any early return (Rules of
  // Hooks). The focus trap is a no-op when `isOpen` is false, so it's
  // safe to always call.
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen)

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  // Track mount state for portal (SSR safety)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleEsc)
      // Update URL without navigation. Use the un-patched
      // History.prototype.pushState directly — Next.js 16's App Router
      // monitors `window.history.pushState`, so a path change to
      // `/magazine/[slug]` would otherwise trigger a soft navigation:
      // the [slug]/page.tsx redirect fires → page re-mounts → overlay
      // state is lost. Going through the prototype bypasses that.
      if (article?.slug) {
        History.prototype.pushState.call(
          window.history,
          null,
          '',
          `/magazine/${article.slug}`,
        )
      }
    } else {
      document.body.style.overflow = ''
      // Only restore URL if we were showing an article
      if (article) {
        History.prototype.pushState.call(window.history, null, '', '/magazine')
      }
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, article, handleEsc])

  if (!mounted || !isOpen || !article) return null

  const blocks = (article.contentBlocks ?? []) as Array<{
    type: string
    text?: string
    caption?: string
    imageUrl?: string
    videoUrl?: string
    quote?: string
    attribution?: string
    signoffText?: string
  }>

  // Access gating via entitlements module (§8).
  //
  // Three content tiers:
  //   everyone        — open to all, no badge
  //   premium         — open to all, but badged as subscriber content
  //   paid_subscribers — hard gate; ~200-word preview then CTA
  //
  // Gate reasons drive which CTA copy we show:
  //   'guest'   — not signed in → "Sign up to read"
  //   'upgrade' — signed in but not paid → "Upgrade to paid"
  //   null      — full access
  const userEntitlement = user ? { tier: (tier ?? 'free') as UserTier } : null
  const articleAccessTier = (article.accessTier ?? 'everyone') as AccessTier
  const canRead = canAccess(userEntitlement, { accessTier: articleAccessTier })
  const isPremium = isPremiumContent(articleAccessTier)
  const gateReason: 'guest' | 'upgrade' | null = !canRead
    ? (!user ? 'guest' : 'upgrade')
    : null

  // Compute the soft preview cut-point (~200 words) for gated readers.
  let gateIndex = blocks.length
  if (gateReason) {
    let wordCount = 0
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type === 'ArticleText' && blocks[i].text) {
        wordCount += blocks[i].text!.split(/\s+/).length
      }
      if (wordCount > 200) {
        gateIndex = i + 1
        break
      }
    }
  }

  const visibleBlocks = gateReason ? blocks.slice(0, gateIndex) : blocks

  const theme = resolveTheme(article.backgroundCanvasColour)

  // Portal to body to escape main's stacking context (z-10)
  return createPortal(
    <motion.div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={article.title ?? 'Article'}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-none"
      style={{ backgroundColor: theme.bg }}
    >
      {/* Close button - 16px from the inner edge of 70px padding */}
      <button
        onClick={onClose}
        className="absolute z-[101] w-12 h-12 border border-black bg-transparent text-black flex items-center justify-center text-xl hover:bg-black/10 transition-colors"
        style={{ top: 86, right: 86 }}
        aria-label="Close"
      >
        &#10005;
      </button>

      {/* Middle container - repeating bg image + padding */}
      <div
        className="relative min-h-full"
        style={{
          padding: 70,
          backgroundImage: article.leadMediaUrl ? `url(${article.leadMediaUrl})` : undefined,
          backgroundRepeat: 'repeat',
          backgroundColor: article.leadMediaUrl ? undefined : theme.bg,
        }}
      >
        {/* Inner container - theme background + content */}
        <div
          style={{
            backgroundColor: theme.bg,
            color: theme.text,
            padding: 110,
          }}
        >
          <motion.div
            variants={overlayContentVariants}
            initial="hidden"
            animate="visible"
            className="max-w-[1024px] mx-auto"
          >
        {/* Premium badge — soft signal, not a gate */}
        {isPremium && (
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-ralph-yellow/20 border border-ralph-yellow/50 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#b45309' }}>
              ★ Premium
            </span>
          </div>
        )}

        {/* Title — inherits theme.text from the parent overlay */}
        <h1
          className="max-w-[700px] mx-auto text-3xl md:text-5xl font-bold text-center"
          style={{ marginBottom: '2rem', fontFamily: "'Gooper Trial', serif" }}
        >
          {article.title}
        </h1>

        {/* Divider after title */}
        <div className="w-[420px] h-[2px] bg-black mx-auto" style={{ marginBottom: '1.5rem' }} />

        {/* Badge pills / categories */}
        <div className="flex flex-wrap justify-center gap-2" style={{ marginBottom: '1.5rem' }}>
          {article.contentTags?.map((tag) => (
            <span
              key={tag}
              className="flex items-center justify-center bg-black text-white uppercase"
              style={{
                height: 34,
                paddingLeft: '2rem',
                paddingRight: '2rem',
                fontFamily: "'Gooper Trial', serif",
                fontWeight: 600,
                fontSize: 14,
                lineHeight: 1,
                letterSpacing: 0,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Bylines */}
        <div className="text-center text-sm text-gray-500" style={{ marginBottom: '1.5rem' }}>
          {article.bylineAuthor && <p>Words by: {article.bylineAuthor}</p>}
          {article.bylinePhotographer && (
            <p>Pictures by: {article.bylinePhotographer}</p>
          )}
        </div>

        {/* Divider after bylines */}
        <div className="w-[420px] h-[2px] bg-black mx-auto" style={{ marginBottom: '1.5rem' }} />

        {/* Share buttons */}
        <div className="flex justify-center gap-4" style={{ marginBottom: '1.5rem' }}>
          {['Facebook', 'X', 'Link'].map((label) => (
            <div key={label} style={{ position: 'relative', display: 'inline-block' }}>
              {/* Shadow */}
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'black',
                  pointerEvents: 'none',
                }}
              />
              {/* Button */}
              <button
                className="btn-press flex items-center justify-center"
                style={{
                  position: 'relative',
                  height: 38,
                  paddingLeft: 16,
                  paddingRight: 16,
                  backgroundColor: '#EBEBEB',
                  border: '2px solid black',
                  fontFamily: "'Gooper Trial', serif",
                  fontWeight: 600,
                  fontSize: 16,
                  lineHeight: 1,
                  letterSpacing: 0,
                }}
                aria-label={`Share on ${label}`}
              >
                {label}
              </button>
            </div>
          ))}
        </div>

        {/* Lead image - 1024px max */}
        {article.leadMediaUrl && (
          <div className="w-full aspect-[16/9] overflow-hidden mb-8 border-2 border-black">
            <img
              src={article.leadMediaUrl}
              alt={article.title ?? ''}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article copy - 864px max */}
        <div className="max-w-[864px] mx-auto">
          {/* Subtitle */}
          {article.subtitle && (
            <p
              className="text-center font-semibold text-black mb-6"
              style={{ fontFamily: "'Gooper Trial', serif", fontSize: 22, lineHeight: '31px' }}
            >
              {article.subtitle}
            </p>
          )}

          {/* Intro */}
          {article.intro && (
            <p
              className="font-semibold text-black mb-8"
              style={{ fontFamily: "'Gooper Trial', serif", fontSize: 16, lineHeight: '31px' }}
            >
              {article.intro}
            </p>
          )}

          {/* Content blocks */}
          <div
            className="font-body text-black"
            style={{ fontWeight: 500, fontSize: 15, lineHeight: '31px' }}
          >
            <BlockRenderer blocks={visibleBlocks} />
          </div>
        </div>

        {/* Access gate */}
        {gateReason && gateIndex < blocks.length && (
          <div className="relative mt-8">
            <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            <div className="text-center py-12 px-6 rounded-2xl bg-white shadow-lg border border-ralph-pink/20">
              {gateReason === 'guest' ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Sign up to keep reading
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                    Create a free account to read the full article and access all
                    of Ralph&apos;s magazine content.
                  </p>
                  <button
                    onClick={onSubscribe}
                    className="rounded-full bg-ralph-pink px-8 py-3 text-white font-medium hover:bg-ralph-pink/90 transition-colors"
                  >
                    Sign up to read
                  </button>
                </>
              ) : (
                <>
                  <span className="inline-block text-[10px] font-bold text-ralph-pink uppercase tracking-widest mb-3 px-2 py-0.5 rounded-full border border-ralph-pink/40">
                    Subscriber story
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Upgrade to finish reading
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                    This piece is for paid subscribers. Upgrade for £3/month to
                    read the whole thing plus every future issue.
                  </p>
                  <button
                    onClick={onSubscribe}
                    className="rounded-full bg-ralph-pink px-8 py-3 text-white font-medium hover:bg-ralph-pink/90 transition-colors"
                  >
                    Upgrade to paid
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Paid PDF download */}
        {tier === 'paid' && article.isCoverStory && (
          <div className="text-center mt-12">
            <a
              href="#"
              className="text-sm text-ralph-orange hover:underline"
            >
              Download PDF
            </a>
          </div>
        )}
          </motion.div>
        </div>
      </div>
    </motion.div>,
    document.body
  )
}
