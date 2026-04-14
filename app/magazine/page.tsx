import { getPublishedArticles, getCoverStory } from '@/lib/data/magazine'
import { getSiteCopy } from '@/lib/data/site-copy'
import MagazineClient from '@/components/magazine/MagazineClient'

export const revalidate = 3600

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
