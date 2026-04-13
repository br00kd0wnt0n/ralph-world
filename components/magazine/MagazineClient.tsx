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

interface MagazineClientProps {
  articles: ArticleSummary[]
  coverStory: ArticleSummary | null
  showCoverStory: boolean
}

export default function MagazineClient({
  articles,
  coverStory,
  showCoverStory,
}: MagazineClientProps) {
  const [overlayArticle, setOverlayArticle] = useState<ArticleFull | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  async function openArticle(slug: string) {
    const res = await fetch(`/api/articles/${slug}`)
    if (res.ok) {
      const data = await res.json()
      setOverlayArticle(data)
      setOverlayOpen(true)
    }
  }

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

  const gridArticles = coverStory
    ? articles.filter((a) => a.id !== coverStory.id)
    : articles

  return (
    <>
      {showCoverStory && <MagazineHero />}

      {showCoverStory && coverStory && (
        <CoverStory
          article={coverStory}
          onRead={openArticle}
          onSubscribe={() => setSubscribeOpen(true)}
        />
      )}

      {!showCoverStory && (
        <section className="px-6 pt-12 pb-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-primary">Magazine</h1>
          </div>
        </section>
      )}

      <section className="bg-[#FAFAFA] pt-4 pb-0">
        <Suspense>
          <CategoryTabs />
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
      />
    </>
  )
}
