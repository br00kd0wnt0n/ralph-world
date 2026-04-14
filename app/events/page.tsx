import { getActiveEvents, getPastEvents } from '@/lib/data/events'
import { getSiteCopy } from '@/lib/data/site-copy'
import EventsClient from '@/components/events/EventsClient'

export const revalidate = 3600

export default async function EventsPage() {
  const [activeEvents, pastEvents, copy] = await Promise.all([
    getActiveEvents(),
    getPastEvents(),
    getSiteCopy(),
  ])

  return (
    <EventsClient
      activeEvents={activeEvents}
      pastEvents={pastEvents}
      copy={copy}
    />
  )
}
