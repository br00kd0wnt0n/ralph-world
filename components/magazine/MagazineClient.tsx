'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import SectionIntro from '@/components/layout/SectionIntro'
import CoverStory from './CoverStory'
import CategoryTabs from './CategoryTabs'
import ArticleGrid from './ArticleGrid'
import ArticleOverlay from './ArticleOverlay'
import SubscribeModal from '@/components/layout/SubscribeModal'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import type { ArticleSummary, ArticleFull } from '@/lib/data/magazine'
import type { SiteCopy } from '@/lib/data/site-copy'

interface MagazineClientProps {
  articles: ArticleSummary[]
  coverStory: ArticleSummary | null
  copy?: Partial<SiteCopy>
}

export default function MagazineClient({
  articles,
  coverStory,
  copy,
}: MagazineClientProps) {
  const [overlayArticle, setOverlayArticle] = useState<ArticleFull | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('')

  // Sync category from URL on mount + popstate
  useEffect(() => {
    function sync() {
      const params = new URLSearchParams(window.location.search)
      setActiveCategory(params.get('category') ?? '')
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  async function openArticle(slug: string) {
    if (!slug) return
    const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`)
    if (res.ok) {
      const data = await res.json()
      setOverlayArticle(data)
      setOverlayOpen(true)
    }
  }

  // Re-open the article overlay when the URL carries ?read=slug — covers
  // the "subscribe from gated article → OAuth → back to article" flow.
  // openArticle calls setState inside an async fetch callback, not
  // synchronously in this effect body, so the lint warning is a false
  // positive.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('read')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (slug) openArticle(slug)
  }, [])

  // Handle back button closing overlay
  useEffect(() => {
    function onPopState() {
      if (overlayOpen) {
        setOverlayOpen(false)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [overlayOpen])

  // Client-side category filtering
  const filteredArticles = activeCategory
    ? articles.filter((a) => a.contentTags?.includes(activeCategory))
    : articles

  const gridArticles = coverStory
    ? filteredArticles.filter((a) => a.id !== coverStory.id)
    : filteredArticles

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Intro section with transparent bg */}
      <SectionIntro
        section="magazine"
        heading={copy?.magazine_hero_heading ?? 'Magazine'}
        lines={[
          copy?.magazine_hero_intro_1 ?? 'Get your actual hands on a physically printed, wonderful smelling, quarterly magazine.',
          copy?.magazine_hero_intro_2 ?? 'Editor Josh Jones curates joyously interesting content, brought by a host of fantastic writers, photographers, artists, foodies, comedians and many more marvellous people & stories from around the world.',
        ]}
      />

      {/* Planet + white bg layered with content */}
      <section className="relative">
        {/* Background container - planet at top, white bg fills rest */}
        <div className="absolute inset-0 z-0">
          {/* Planet - fixed height at the top of the bg container */}
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
              style={{
                backgroundImage: 'url(/imgs/planet_background_magazine.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_magazine.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          {/* White bg fills below the planet */}
          <div
            className="absolute bg-white"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </div>

        {/* Content layer - tweak paddingTop / child marginTop to position
            elements anywhere, including overflowing up over the planet */}
        <div
          className="relative z-10 pb-8 min-h-[50vh]"
          style={{ paddingTop: 200 }}
        >
          {/* Cover Story title */}
          <h2 className="max-w-5xl mx-auto px-6 mb-6">
            <img
              src="/imgs/text_cover_story.svg"
              alt="Cover Story"
              style={{ width: 265, height: 76 }}
            />
          </h2>

          <CoverStory
            article={coverStory || {
              id: 'placeholder',
              slug: 'placeholder',
              title: 'In conversation with Taskmaster maestros Greg Davies and Alex Horne as they celebrate 20 seasons of their hit show.',
              subtitle: null,
              intro: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
              leadMediaUrl: null,
              leadMediaType: null,
              articleType: null,
              contentTags: ['Comedy', 'Ralph Recommends', 'Juicee', 'Toilet Friendly'],
              isCoverStory: true,
              issueNumber: null,
              accessTier: 'free',
              publishedAt: null,
              bylineAuthor: null,
              bylinePhotographer: null,
              backgroundCanvasColour: null,
            }}
            onRead={openArticle}
            onSubscribe={() => setSubscribeOpen(true)}
          />

          <Suspense>
            <CategoryTabs
              active={activeCategory}
              onChange={setActiveCategory}
            />
          </Suspense>
          <ArticleGrid articles={gridArticles} onArticleClick={openArticle} />
        </div>
      </section>

      <ArticleOverlay
        article={overlayArticle}
        isOpen={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        onSubscribe={() => setSubscribeOpen(true)}
      />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        returnTo={
          overlayArticle?.slug
            ? `/magazine?read=${encodeURIComponent(overlayArticle.slug)}`
            : '/magazine'
        }
      />
    </motion.div>
  )
}
