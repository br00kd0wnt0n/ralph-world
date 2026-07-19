import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getArticleBySlug,
  getPublishedArticles,
  getCoverStory,
} from '@/lib/data/magazine'
import { getSiteCopy } from '@/lib/data/site-copy'
import MagazineClient from '@/components/magazine/MagazineClient'
import { JsonLd } from '@/components/seo/JsonLd'

export const revalidate = 60

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ralph.world'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) {
    return { title: 'Article', robots: { index: false, follow: false } }
  }
  const title = article.title || 'Article'
  const description =
    article.subtitle?.trim() ||
    article.intro?.trim().slice(0, 200) ||
    'Read it on Ralph.'
  const image = article.leadMediaUrl || article.cardImageUrl || undefined
  return {
    title,
    description,
    alternates: { canonical: `/magazine/${slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/magazine/${slug}`,
      images: image ? [{ url: image }] : undefined,
      publishedTime: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : undefined,
      authors: article.bylineAuthor ? [article.bylineAuthor] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const [article, articles, copy] = await Promise.all([
    getArticleBySlug(slug),
    getPublishedArticles(),
    getSiteCopy(),
  ])
  if (!article) notFound()
  const coverStory = getCoverStory(articles)

  const image = article.leadMediaUrl || article.cardImageUrl || undefined

  return (
    <>
      {/* Article JSON-LD — headline/teaser/image only; the paid body stays
          behind the /api/articles tier gate and is never emitted server-side. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title || 'Article',
          description: article.subtitle || article.intro || undefined,
          image: image ? [image] : undefined,
          datePublished: article.publishedAt
            ? new Date(article.publishedAt).toISOString()
            : undefined,
          author: article.bylineAuthor
            ? { '@type': 'Person', name: article.bylineAuthor }
            : undefined,
          publisher: {
            '@type': 'Organization',
            name: 'Ralph',
            logo: {
              '@type': 'ImageObject',
              url: `${SITE_URL}/icon-512.png`,
            },
          },
          mainEntityOfPage: `${SITE_URL}/magazine/${slug}`,
        }}
      />
      {/* Same shell as /magazine; initialArticleSlug opens the overlay over
          the list (tier-gated fetch, so the paywall is preserved). */}
      <MagazineClient
        articles={articles}
        coverStory={coverStory}
        copy={copy}
        initialArticleSlug={slug}
      />
    </>
  )
}
