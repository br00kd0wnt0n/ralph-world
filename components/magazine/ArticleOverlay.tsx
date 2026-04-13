'use client'

import { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { overlayVariants, overlayContentVariants } from '@/lib/animation/magazine'
import { useAuth } from '@/context/AuthContext'
import BlockRenderer from './BlockRenderer'
import type { ArticleFull } from '@/lib/data/magazine'

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
  const { user, subscriptionStatus } = useAuth()

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleEsc)
      // Update URL without navigation
      window.history.pushState(null, '', `/magazine/${article?.slug ?? ''}`)
    } else {
      document.body.style.overflow = ''
      // Only restore URL if we were showing an article
      if (article) {
        window.history.pushState(null, '', '/magazine')
      }
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, article, handleEsc])

  if (!isOpen || !article) return null

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

  // Guest access gate: count words across text blocks
  const isGuest = !user
  let wordCount = 0
  let gateIndex = blocks.length
  if (isGuest) {
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

  const visibleBlocks = isGuest ? blocks.slice(0, gateIndex) : blocks

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        backgroundColor: article.backgroundCanvasColour || '#FAFAFA',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/20 backdrop-blur text-white flex items-center justify-center text-lg hover:bg-black/40 transition-colors"
        aria-label="Close"
      >
        &#10005;
      </button>

      <motion.div
        variants={overlayContentVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[720px] mx-auto px-6 py-16"
      >
        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-6 text-gray-900">
          {article.title}
        </h1>

        {/* Badge pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {article.contentTags?.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs font-medium rounded-full bg-ralph-orange/10 text-ralph-orange"
            >
              {tag}
            </span>
          ))}
          {article.issueNumber && (
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
              Issue #{article.issueNumber}
            </span>
          )}
        </div>

        {/* Bylines */}
        <div className="text-center text-sm text-gray-500 mb-6">
          {article.bylineAuthor && <p>Words by: {article.bylineAuthor}</p>}
          {article.bylinePhotographer && (
            <p>Pictures by: {article.bylinePhotographer}</p>
          )}
        </div>

        <hr className="border-gray-200 mb-8" />

        {/* Lead image */}
        {article.leadMediaUrl && (
          <div className="w-full aspect-[16/9] rounded-xl overflow-hidden mb-8 bg-gray-100">
            <img
              src={article.leadMediaUrl}
              alt={article.title ?? ''}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Subtitle */}
        {article.subtitle && (
          <p className="text-center text-lg italic text-gray-600 mb-6">
            {article.subtitle}
          </p>
        )}

        {/* Intro */}
        {article.intro && (
          <p className="text-lg font-semibold text-gray-800 mb-8 leading-relaxed">
            {article.intro}
          </p>
        )}

        {/* Content blocks */}
        <BlockRenderer blocks={visibleBlocks} />

        {/* Guest access gate */}
        {isGuest && gateIndex < blocks.length && (
          <div className="relative mt-8">
            <div className="absolute inset-x-0 -top-24 h-24 bg-gradient-to-t from-[#FAFAFA] to-transparent pointer-events-none" />
            <div className="text-center py-12 px-6 rounded-2xl bg-white shadow-lg">
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
            </div>
          </div>
        )}

        {/* Paid PDF download */}
        {subscriptionStatus === 'paid' && article.isCoverStory && (
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
    </motion.div>
  )
}
