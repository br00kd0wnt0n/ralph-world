import type { Metadata } from 'next'
import { getLatestMagazine } from '@/lib/data/latest-magazine'
import { pickAttribution } from '@/lib/attribution'
import SubscribeClient from '@/components/subscribe/SubscribeClient'

// The campaign landing page Vicky points ads + emails at. utm_* tags are read
// here (server-side, so the page renders in full on first load) and passed
// through to /join-ralph on the buttons. The cover comes from Shopify
// (fetch-cached); the member's tier is read client-side from the session the
// root layout seeds.

const title = 'Join Ralph'
const description =
  'Join Ralph for free to read the magazine and watch Ralph TV, or get the print magazine through your letterbox every quarter for £3 a month.'

export async function generateMetadata(): Promise<Metadata> {
  const latest = await getLatestMagazine()
  return {
    title,
    description,
    alternates: { canonical: '/subscribe' },
    openGraph: {
      type: 'website',
      title,
      description,
      url: '/subscribe',
      images: latest ? [{ url: latest.imageUrl }] : undefined,
    },
  }
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [latest, params] = await Promise.all([getLatestMagazine(), searchParams])
  return <SubscribeClient latest={latest} attribution={pickAttribution(params)} />
}
