import { getPublishedArticles, getCoverStory } from '@/lib/data/magazine'
import MagazineClient from '@/components/magazine/MagazineClient'

export const revalidate = 3600

interface PageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function MagazinePage({ searchParams }: PageProps) {
  const { category } = await searchParams
  const articles = await getPublishedArticles(category)
  const coverStory = !category ? getCoverStory(articles) : null
  const showCoverStory = !category

  return (
    <MagazineClient
      articles={articles}
      coverStory={coverStory}
      showCoverStory={showCoverStory}
    />
  )
}
