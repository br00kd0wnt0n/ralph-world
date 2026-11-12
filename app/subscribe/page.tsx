import type { Metadata } from 'next'
import { getLatestMagazine } from '@/lib/data/latest-magazine'
import { pickAttribution } from '@/lib/attribution'
import SubscribeClient from '@/components/subscribe/SubscribeClient'
import { getSiteCopy } from '@/lib/data/site-copy'
import { buildPageMetadata } from '@/lib/seo'

// The campaign landing page Vicky points ads + emails at. utm_* tags are read
// here (server-side, so the page renders in full on first load) and passed
// through to /join-ralph on the buttons. The cover comes from Shopify
// (fetch-cached); the member's tier is read client-side from the session the
// root layout seeds.

// Site Copy → Page SEO. Blank image = the latest magazine cover.
export async function generateMetadata(): Promise<Metadata> {
  const [copy, latest] = await Promise.all([getSiteCopy(), getLatestMagazine()])
  return buildPageMetadata(copy, 'subscribe', {
    path: '/subscribe',
    autoImage: latest?.imageUrl,
  })
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [latest, params] = await Promise.all([getLatestMagazine(), searchParams])
  return <SubscribeClient latest={latest} attribution={pickAttribution(params)} />
}
