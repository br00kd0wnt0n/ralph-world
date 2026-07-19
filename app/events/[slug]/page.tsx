import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getActiveEvents, getEventBySlug } from '@/lib/data/events'
import { getSiteCopy } from '@/lib/data/site-copy'
import EventsClient from '@/components/events/EventsClient'
import { JsonLd } from '@/components/seo/JsonLd'

export const revalidate = 60

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ralph.world'

interface EventSlugPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: EventSlugPageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) {
    return { title: 'Event', robots: { index: false, follow: false } }
  }
  const title = event.title || 'Event'
  const description =
    event.descriptionShort?.trim().slice(0, 200) ||
    [event.locationName, event.locationAddress].filter(Boolean).join(', ') ||
    'A Ralph event.'
  const image = event.thumbnailUrl || undefined
  return {
    title,
    description,
    alternates: { canonical: `/events/${slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/events/${slug}`,
      images: image ? [{ url: image }] : undefined,
    },
  }
}

export default async function EventSlugPage({ params }: EventSlugPageProps) {
  const { slug } = await params
  const [event, activeEvents, copy] = await Promise.all([
    getEventBySlug(slug),
    getActiveEvents(),
    getSiteCopy(),
  ])
  if (!event) notFound()

  const hasLocation = Boolean(event.locationName || event.locationAddress)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.title || 'Event',
          startDate: event.eventDate
            ? new Date(event.eventDate).toISOString()
            : undefined,
          description: event.descriptionShort || undefined,
          image: event.thumbnailUrl || undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode:
            'https://schema.org/OfflineEventAttendanceMode',
          location: hasLocation
            ? {
                '@type': 'Place',
                name: event.locationName || undefined,
                address: {
                  '@type': 'PostalAddress',
                  streetAddress: event.locationAddress || undefined,
                  postalCode: event.locationPostcode || undefined,
                  addressCountry: event.countryCode || undefined,
                },
              }
            : undefined,
          url: event.externalTicketUrl || `${SITE_URL}/events/${slug}`,
          ...(event.externalTicketUrl
            ? {
                offers: {
                  '@type': 'Offer',
                  url: event.externalTicketUrl,
                  availability: 'https://schema.org/InStock',
                },
              }
            : {}),
        }}
      />
      {/* Same shell as /events; initialShowSlug opens that event's panel. */}
      <EventsClient
        activeEvents={activeEvents}
        copy={copy}
        initialShowSlug={slug}
      />
    </>
  )
}
