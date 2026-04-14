'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import EventsHero from './EventsHero'
import CrowdBackground from './CrowdBackground'
import EventCreature from './EventCreature'
import EventFlyout, { type FlyoutStage } from './EventFlyout'
import PastEvents from './PastEvents'
import SubscribeModal from '@/components/layout/SubscribeModal'
import Footer from '@/components/layout/Footer'
import type { EventRow } from '@/lib/data/events'
import type { EventCreatureData } from './EventCreature.types'

interface EventsClientProps {
  activeEvents: EventRow[]
  pastEvents: EventRow[]
}

function toCreatureData(row: EventRow): EventCreatureData {
  return {
    id: row.id,
    title: row.title ?? '',
    description_short: row.descriptionShort ?? '',
    event_date: row.eventDate ? row.eventDate.toISOString() : null,
    accent_colour: row.accentColour || '#00C4B4',
    badge: row.badge,
    creature_x: row.creatureX ? Number(row.creatureX) : 50,
    creature_y: row.creatureY ? Number(row.creatureY) : 50,
    external_ticket_url: row.externalTicketUrl,
    location_name: row.locationName,
    location_address: row.locationAddress,
    thumbnail_url: row.thumbnailUrl,
  }
}

export default function EventsClient({
  activeEvents,
  pastEvents,
}: EventsClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stage, setStage] = useState<FlyoutStage>('minimal')
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  const creatureEvents = activeEvents.map(toCreatureData)
  const selectedEvent = creatureEvents.find((e) => e.id === selectedId) ?? null

  function handleSelect(eventId: string) {
    if (selectedId === eventId) {
      // Toggle off
      setSelectedId(null)
      setStage('minimal')
    } else {
      setSelectedId(eventId)
      setStage('minimal')
    }
  }

  function handleClose() {
    setSelectedId(null)
    setStage('minimal')
  }

  return (
    <>
      <EventsHero />

      <section className="relative" onClick={handleClose}>
        <CrowdBackground>
          {creatureEvents.map((event) => (
            <EventCreature
              key={event.id}
              event={event}
              isSelected={selectedId === event.id}
              onSelect={handleSelect}
            />
          ))}

          <AnimatePresence>
            {selectedEvent && stage !== 'full' && (
              <EventFlyout
                key={`${selectedEvent.id}-${stage}`}
                event={selectedEvent}
                stage={stage}
                onStageChange={setStage}
                onClose={handleClose}
                onSubscribe={() => setSubscribeOpen(true)}
              />
            )}
          </AnimatePresence>
        </CrowdBackground>
      </section>

      {/* Stage 3 full detail renders above everything */}
      <AnimatePresence>
        {selectedEvent && stage === 'full' && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60"
              onClick={handleClose}
            />
            <EventFlyout
              event={selectedEvent}
              stage={stage}
              onStageChange={setStage}
              onClose={handleClose}
              onSubscribe={() => setSubscribeOpen(true)}
            />
          </>
        )}
      </AnimatePresence>

      <PastEvents events={pastEvents} />

      <Footer variant="light" />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </>
  )
}
