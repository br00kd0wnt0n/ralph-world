import { getActiveEvents, getPastEvents } from '@/lib/data/events'
import EventsClient from '@/components/events/EventsClient'

export const revalidate = 3600

export default async function EventsPage() {
  const [activeEvents, pastEvents] = await Promise.all([
    getActiveEvents(),
    getPastEvents(),
  ])

  return <EventsClient activeEvents={activeEvents} pastEvents={pastEvents} />
}
