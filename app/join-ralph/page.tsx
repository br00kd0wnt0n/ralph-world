import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getLatestMagazine } from '@/lib/data/latest-magazine'
import JoinRalphClient from '@/components/join-ralph/JoinRalphClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Join Ralph',
  description: 'Join the Ralph community and get access to exclusive content.',
  alternates: { canonical: '/join-ralph' },
}

export default async function JoinRalphPage() {
  const latest = await getLatestMagazine()

  return (
    <Suspense>
      <JoinRalphClient magCoverUrl={latest?.imageUrl ?? null} />
    </Suspense>
  )
}
