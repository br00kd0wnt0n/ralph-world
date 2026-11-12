import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CaseStudyPage from '@/components/case-studies/CaseStudyPage'
import {
  getCaseStudyBySlug,
  getPublishedCaseStudySlugs,
} from '@/lib/data/case-studies'
import { getSiteCopy } from '@/lib/data/site-copy'
import { BASE_OPEN_GRAPH, resolveCaseStudySeo, shareImages } from '@/lib/seo'

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
  const [study, copy] = await Promise.all([getCaseStudyBySlug(slug), getSiteCopy()])
  if (!study) return { title: 'Not found' }
  // CMS "Search & sharing" overrides, else title / subtitle / thumbnail
  // (lib/seo.ts). The title is bare: the layout template adds " | Ralph"
  // (it used to add it on top of a hard-coded " — Ralph").
  const { title, description, image } = resolveCaseStudySeo(study)
  return {
    title,
    description,
    alternates: { canonical: `/case-studies/${slug}` },
    openGraph: {
      ...BASE_OPEN_GRAPH,
      type: 'website',
      title,
      description,
      url: `/case-studies/${slug}`,
      images: shareImages(image, copy.seo_default_image),
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
