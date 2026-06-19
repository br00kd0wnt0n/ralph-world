import { getDb } from '@/lib/db'
import { articles } from '@/lib/db/schema'
import { asc, eq, desc, and, arrayContains, sql } from 'drizzle-orm'

export interface ArticleSummary {
  id: string
  slug: string
  title: string | null
  subtitle: string | null
  intro: string | null
  leadMediaUrl: string | null
  leadMediaType: string | null
  cardImageUrl: string | null
  articleType: string | null
  contentTags: string[] | null
  isCoverStory: boolean | null
  issueNumber: number | null
  accessTier: string | null
  publishedAt: Date | null
  bylineAuthor: string | null
  bylinePhotographer: string | null
  backgroundCanvasColour: string | null
  sortOrder: number | null
  shopCalloutUrl: string | null
  shopCalloutLabel: string | null
}

export interface ArticleFull extends ArticleSummary {
  backgroundFrameType: string | null
  backgroundFrameValue: string | null
  titleImageUrl: string | null
  contentBlocks: unknown
  /** Set by GET /api/articles/[slug] — true when the body was withheld. */
  gated?: boolean
  /** CTA driver: 'guest' (sign up) | 'upgrade' (go paid) | null. */
  gateReason?: 'guest' | 'upgrade' | null
}

// Summary column set for listing/grid/cover — deliberately EXCLUDES
// contentBlocks so paid/premium article bodies never reach the client via
// the magazine page's RSC payload. Full (gated) content is served only by
// GET /api/articles/[slug], which enforces the access tier server-side.
const ARTICLE_SUMMARY_COLUMNS = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  subtitle: articles.subtitle,
  intro: articles.intro,
  leadMediaUrl: articles.leadMediaUrl,
  leadMediaType: articles.leadMediaType,
  cardImageUrl: articles.cardImageUrl,
  articleType: articles.articleType,
  contentTags: articles.contentTags,
  isCoverStory: articles.isCoverStory,
  issueNumber: articles.issueNumber,
  accessTier: articles.accessTier,
  publishedAt: articles.publishedAt,
  bylineAuthor: articles.bylineAuthor,
  bylinePhotographer: articles.bylinePhotographer,
  backgroundCanvasColour: articles.backgroundCanvasColour,
  sortOrder: articles.sortOrder,
  shopCalloutUrl: articles.shopCalloutUrl,
  shopCalloutLabel: articles.shopCalloutLabel,
} as const

export async function getPublishedArticles(category?: string) {
  try {
    const db = getDb()

    const conditions = [eq(articles.status, 'published')]
    if (category) {
      conditions.push(arrayContains(articles.contentTags, [category]))
    }

    // Manually-positioned articles first (sort_order ASC, NULLS LAST), then
    // unpositioned by latest publish date. Editors drag-to-reorder in the CMS.
    return await db
      .select(ARTICLE_SUMMARY_COLUMNS)
      .from(articles)
      .where(and(...conditions))
      .orderBy(asc(sql`${articles.sortOrder} NULLS LAST`), desc(articles.publishedAt))
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

interface BlockLike {
  type?: string
  text?: string
}

/**
 * Server-side paywall truncation (security: paid content must never be sent
 * in full to unentitled callers). Returns the leading blocks up to and
 * including the one that pushes the running word count past ~200 — the same
 * preview cut-point the overlay used to compute client-side. Counts body
 * copy from text + portrait-wrap blocks. Applied in the article API route
 * BEFORE the response leaves the server, so the full body is never exposed.
 */
export function previewArticleBlocks<T extends BlockLike>(blocks: T[]): T[] {
  let wordCount = 0
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if ((b.type === 'ArticleText' || b.type === 'ArticleImageTextWrap') && b.text) {
      const plain = b.text.replace(/<[^>]*>/g, ' ')
      wordCount += plain.split(/\s+/).filter(Boolean).length
    }
    if (wordCount > 200) return blocks.slice(0, i + 1)
  }
  return blocks
}
