import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getLatestMagazine } from '@/lib/data/latest-magazine'
import JoinRalphClient from '@/components/join-ralph/JoinRalphClient'
import { getSiteCopy } from '@/lib/data/site-copy'
import { buildPageMetadata } from '@/lib/seo'

export const revalidate = 300

// Site Copy → Page SEO.
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSiteCopy(), 'join_ralph', { path: '/join-ralph' })
}

export default async function JoinRalphPage() {
  const latest = await getLatestMagazine()

  return (
    <Suspense>
      <JoinRalphClient magCoverUrl={latest?.imageUrl ?? null} />
    </Suspense>
  )
}
