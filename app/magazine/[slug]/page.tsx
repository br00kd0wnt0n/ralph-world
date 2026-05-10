import { redirect } from 'next/navigation'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  redirect(`/magazine?read=${encodeURIComponent(slug)}`)
}
