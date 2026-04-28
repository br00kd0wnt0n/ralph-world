'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionIntro from '@/components/layout/SectionIntro'
import CrowdBackground from './CrowdBackground'
import EventCreature from './EventCreature'
import EventFlyout, { type FlyoutStage } from './EventFlyout'
import PastEvents from './PastEvents'
import SubscribeModal from '@/components/layout/SubscribeModal'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import type { EventRow } from '@/lib/data/events'
import type { EventCreatureData } from './EventCreature.types'
import type { SiteCopy } from '@/lib/data/site-copy'

interface EventsClientProps {
  activeEvents: EventRow[]
  pastEvents: EventRow[]
  copy?: Partial<SiteCopy>
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
    country_code: row.countryCode,
  }
}

export default function EventsClient({
  activeEvents,
  pastEvents,
  copy,
}: EventsClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stage, setStage] = useState<FlyoutStage>('card')
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  const creatureEvents = activeEvents.map(toCreatureData)
  const selectedEvent = creatureEvents.find((e) => e.id === selectedId) ?? null
  const isFullOpen = Boolean(selectedEvent) && stage === 'full'

  function handleSelect(eventId: string) {
    if (selectedId === eventId) {
      setSelectedId(null)
      setStage('card')
    } else {
      setSelectedId(eventId)
      setStage('card')
    }
  }

  function handleClose() {
    setSelectedId(null)
    setStage('card')
  }

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Intro section with transparent bg */}
      <SectionIntro
        section="events"
        heading={copy?.events_hero_heading ?? "Let's Meet Up"}
        lines={[
          copy?.events_hero_subtitle ?? 'For real. IRL.',
          copy?.events_hero_helper ?? 'Check below for the latest events.',
        ]}
      />

      <section className="relative" onClick={handleClose}>
        <CrowdBackground>
          {creatureEvents.map((event) => {
            const isSelected = selectedId === event.id
            // When the full modal is open, fade the other creatures away
            // so attention stays on the centred card.
            const dimmed = isFullOpen && !isSelected
            return (
              <EventCreature
                key={event.id}
                event={event}
                isSelected={isSelected}
                isDimmed={dimmed}
                onSelect={handleSelect}
              />
            )
          })}
        </CrowdBackground>
      </section>

      {/* Single flyout that morphs card → full via layout animation */}
      <AnimatePresence>
        {isFullOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={handleClose}
          />
        )}
        {selectedEvent && (
          <EventFlyout
            key={selectedEvent.id}
            event={selectedEvent}
            stage={stage}
            onStageChange={setStage}
            onClose={handleClose}
            onSubscribe={() => setSubscribeOpen(true)}
          />
        )}
      </AnimatePresence>

      <PastEvents events={pastEvents} heading={copy?.events_past_heading} />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
