import { getPublishedArticles, getCoverStory } from '@/lib/data/magazine'
import MagazineClient from '@/components/magazine/MagazineClient'

export const revalidate = 3600

export default async function MagazinePage() {
  const articles = await getPublishedArticles()
  const coverStory = getCoverStory(articles)

  return (
    <MagazineClient
      articles={articles}
      coverStory={coverStory}
    />
  )
}
