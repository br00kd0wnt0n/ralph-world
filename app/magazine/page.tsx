import type { Metadata } from 'next'
import { getPublishedArticles, getCoverStory } from '@/lib/data/magazine'
import { getSiteCopy } from '@/lib/data/site-copy'
import MagazineClient from '@/components/magazine/MagazineClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Magazine',
  description:
    'Long reads, sharp takes, and proper pop-culture coverage from Ralph.',
  openGraph: {
    title: 'Ralph Magazine',
    description:
      'Long reads, sharp takes, and proper pop-culture coverage.',
  },
}

export default async function MagazinePage() {
  const [articles, copy] = await Promise.all([
    getPublishedArticles(),
    getSiteCopy(),
  ])
  const coverStory = getCoverStory(articles)

  return (
    <MagazineClient
      articles={articles}
      coverStory={coverStory}
      copy={copy}
    />
  )
}
