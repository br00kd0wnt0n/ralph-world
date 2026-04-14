import type { ComponentType } from 'react'

export interface EventCreatureData {
  id: string
  title: string
  description_short: string
  event_date: string | null
  accent_colour: string
  badge: string | null
  creature_x: number
  creature_y: number
  external_ticket_url: string | null
  location_name: string | null
  location_address: string | null
  thumbnail_url: string | null
}

export interface EventCreatureProps {
  event: EventCreatureData
  isSelected: boolean
  onSelect: (eventId: string) => void
  illustration?: ComponentType
}

export interface CrowdBackgroundProps {
  children: React.ReactNode
  illustration?: ComponentType
}
