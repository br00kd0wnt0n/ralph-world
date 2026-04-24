'use client'

import { useState, useEffect, Suspense } from 'react'
import MagazineHero from './MagazineHero'
import CoverStory from './CoverStory'
import CategoryTabs from './CategoryTabs'
import ArticleGrid from './ArticleGrid'
import ArticleOverlay from './ArticleOverlay'
import SubscribeModal from '@/components/layout/SubscribeModal'
import Footer from '@/components/layout/Footer'
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
    <>
      {/* Hero always visible */}
      <MagazineHero
        heading={copy?.magazine_hero_heading}
        intro1={copy?.magazine_hero_intro_1}
        intro2={copy?.magazine_hero_intro_2}
        shopCta={copy?.magazine_shop_cta}
        themeKey={copy?.magazine_hero_theme}
      />

      {/* Cover story — always visible */}
      {coverStory && (
        <CoverStory
          article={coverStory}
          onRead={openArticle}
          onSubscribe={() => setSubscribeOpen(true)}
        />
      )}

      {/* Tabs + Grid on light bg */}
      <section className="bg-[#FAFAFA] pt-4 pb-8 min-h-[50vh]">
        <Suspense>
          <CategoryTabs
            active={activeCategory}
            onChange={setActiveCategory}
          />
        </Suspense>
        <ArticleGrid articles={gridArticles} onArticleClick={openArticle} />
      </section>

      <Footer variant="light" />

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
    </>
  )
}
