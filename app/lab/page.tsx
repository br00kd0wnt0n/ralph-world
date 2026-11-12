import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import { getPublishedLabItems } from '@/lib/data/lab'
import { getSiteCopy } from '@/lib/data/site-copy'
import LabClient from '@/components/lab/LabClient'

export const revalidate = 60

// Site Copy → Page SEO.
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSiteCopy(), 'lab', { path: '/lab' })
}

export default async function LabPage() {
  const [items, copy] = await Promise.all([
    getPublishedLabItems(),
    getSiteCopy(),
  ])
  return <LabClient items={items} copy={copy} />
}
