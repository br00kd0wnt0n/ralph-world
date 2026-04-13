import { getDb } from '@/lib/db'
import { articles } from '@/lib/db/schema'
import { eq, desc, and, arrayContains } from 'drizzle-orm'

export interface ArticleSummary {
  id: string
  slug: string
  title: string | null
  subtitle: string | null
  intro: string | null
  leadMediaUrl: string | null
  leadMediaType: string | null
  articleType: string | null
  contentTags: string[] | null
  isCoverStory: boolean | null
  issueNumber: number | null
  accessTier: string | null
  publishedAt: Date | null
  bylineAuthor: string | null
  bylinePhotographer: string | null
  backgroundCanvasColour: string | null
}

export interface ArticleFull extends ArticleSummary {
  backgroundFrameType: string | null
  backgroundFrameValue: string | null
  titleImageUrl: string | null
  contentBlocks: unknown
}

export async function getPublishedArticles(category?: string) {
  try {
    const db = getDb()

    const conditions = [eq(articles.status, 'published')]
    if (category) {
      conditions.push(arrayContains(articles.contentTags, [category]))
    }

    return await db
      .select()
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.publishedAt))
  } catch {
    return []
  }
}

export async function getArticleBySlug(slug: string): Promise<ArticleFull | null> {
  try {
    const db = getDb()
    const [article] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .limit(1)
    return (article as ArticleFull) ?? null
  } catch {
    return null
  }
}

export function getCoverStory(articleList: ArticleSummary[]): ArticleSummary | null {
  return articleList.find((a) => a.isCoverStory) ?? articleList[0] ?? null
}
