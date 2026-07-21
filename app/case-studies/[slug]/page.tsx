import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CaseStudyPage from '@/components/case-studies/CaseStudyPage'
import {
  getCaseStudyBySlug,
  getPublishedCaseStudySlugs,
} from '@/lib/data/case-studies'

// Case studies are edited from the CMS; a revalidateTag('case-studies')
// on save invalidates immediately, so this TTL is only the safety net
// for missed tag pings.
export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const study = await getCaseStudyBySlug(slug)
  if (!study) return { title: 'Not found' }
  const title = study.title
    ? `${study.title} — Ralph`
    : 'Case Study — Ralph'
  return {
    title,
    description: study.subtitle ?? undefined,
    alternates: { canonical: `/case-studies/${slug}` },
    openGraph: {
      title: study.title ?? undefined,
      description: study.subtitle ?? undefined,
      images: study.thumbnailUrl ? [study.thumbnailUrl] : undefined,
    },
  }
}

// Pre-render every published case study at build time. New rows show up
// on the next deploy or via the revalidate tag; unknown slugs fall
// through to notFound() below.
export async function generateStaticParams() {
  const slugs = await getPublishedCaseStudySlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function CaseStudyRoute({ params }: PageProps) {
  const { slug } = await params
  const study = await getCaseStudyBySlug(slug)
  if (!study) notFound()
  return <CaseStudyPage study={study} />
}
