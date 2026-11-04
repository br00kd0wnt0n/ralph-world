'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { joinPromptVariants } from '@/lib/animation/magazine'
import { safeGet, safeSet } from '@/lib/safe-storage'
import { trackEvent } from '@/lib/gtm-client-init'

/**
 * Floating "join Ralph" nudge for signed-out readers of an open article.
 *
 * The parent (ArticleOverlay) decides WHO sees it: guests, on articles that
 * aren't gated (those already show the gate's own call to action). This
 * component decides WHEN:
 *   - after the reader has scrolled 30% of the article, or 25 seconds in;
 *   - not while the cookie banner is up (it sits on the same bottom edge);
 *   - never once dismissed in this browser (× is remembered for good);
 *   - hidden while the end-of-article "Enjoying Ralph?" strip is on screen,
 *     so the two never show at once.
 *
 * Phones: a slim bar along the bottom. From 768px: a small corner card.
 * Rendered inside the overlay frame (absolute, not fixed: the frame is a
 * transformed motion element, which would re-anchor `fixed`).
 */

const STORAGE_KEY = 'ralph-article-join-prompt-dismissed'
const SCROLL_TRIGGER = 0.3
const TIME_TRIGGER_MS = 25_000

interface Props {
  slug: string
  /** The overlay's scrolling element. */
  scrollRef: RefObject<HTMLElement | null>
  /** The end-of-article guest strip; the prompt hides while it's visible. */
  endRef: RefObject<HTMLElement | null>
}

export default function ArticleJoinPrompt({ slug, scrollRef, endRef }: Props) {
  const reduceMotion = useReducedMotion()
  // Read once on mount; storage errors (private mode, blocked) read as "not
  // dismissed" via safeGet.
  const [dismissed, setDismissed] = useState(() => safeGet(STORAGE_KEY) !== null)
  const [triggered, setTriggered] = useState(false)
  const [endInView, setEndInView] = useState(false)
  const viewTracked = useRef(false)

  // Wait for the scroll / time trigger, then for the cookie banner to go.
  useEffect(() => {
    if (dismissed || triggered) return
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      const el = scrollRef.current
      const max = el ? el.scrollHeight - el.clientHeight : 0
      const scrolled = max > 0 && el!.scrollTop / max >= SCROLL_TRIGGER
      const timeUp = Date.now() - startedAt >= TIME_TRIGGER_MS
      const bannerUp = document.querySelector('[data-cookie-banner]') !== null
      if ((scrolled || timeUp) && !bannerUp) {
        setTriggered(true)
        window.clearInterval(id)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [dismissed, triggered, scrollRef])

  // Track the end-of-article strip.
  useEffect(() => {
    const target = endRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setEndInView(entry.isIntersecting),
      { root: scrollRef.current, threshold: 0.1 }
    )
    io.observe(target)
    return () => io.disconnect()
  }, [endRef, scrollRef])

  const show = triggered && !dismissed && !endInView

  useEffect(() => {
    if (show && !viewTracked.current) {
      viewTracked.current = true
      trackEvent('article_join_prompt_view', { slug })
    }
  }, [show, slug])

  function dismiss() {
    safeSet(STORAGE_KEY, new Date().toISOString())
    setDismissed(true)
    trackEvent('article_join_prompt_dismiss', { slug })
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          key="join-prompt"
          aria-label="Join Ralph"
          variants={joinPromptVariants}
          initial={reduceMotion ? { opacity: 0 } : 'hidden'}
          animate="visible"
          exit={reduceMotion ? { opacity: 0 } : 'exit'}
          className="absolute z-[101] inset-x-0 bottom-0 md:inset-x-auto md:bottom-6 md:right-6 md:w-[320px]"
        >
          {/* Pink offset shadow (desktop card only). */}
          <div
            className="hidden md:block absolute inset-0 translate-x-1.5 translate-y-1.5 bg-ralph-pink"
            aria-hidden="true"
          />
          <div
            className="relative flex items-center gap-3 bg-white text-black border-t-2 md:border-2 border-black px-4 py-3 md:p-5 md:flex-col md:items-start"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <p className="flex-1 min-w-0 text-body-sm md:text-body leading-snug">
              <span
                className="block md:mb-1 md:text-lg"
                style={{ fontFamily: "var(--font-intro, 'Gooper Trial'), serif", fontWeight: 600 }}
              >
                Enjoying Ralph?
              </span>
              <span className="block text-black/70 md:text-black">
                Join free for unlimited Ralph TV and more.
              </span>
            </p>
            <div className="flex items-center gap-2 md:mt-3">
              <Link
                href="/subscribe"
                onClick={() => trackEvent('article_join_prompt_click', { slug })}
                className="btn-press shrink-0 inline-flex items-center justify-center h-9 px-4 border-2 border-black bg-ralph-pink text-black text-sm"
                style={{ fontFamily: "var(--font-intro, 'Gooper Trial'), serif", fontWeight: 600 }}
              >
                Join Ralph
              </Link>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close, don’t show this again"
              className="shrink-0 w-9 h-9 -mr-1 flex items-center justify-center text-black/60 hover:text-black text-lg md:absolute md:top-2 md:right-2"
            >
              &#10005;
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
