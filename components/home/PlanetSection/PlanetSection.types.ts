import type { ReactNode } from 'react'

export interface ModuleCardData {
  heading: string
  tagline: string
  description: string // 128 chars max
  items: ModuleItem[]
  href: string
  ctaLabel: string
}

export interface ModuleItem {
  id: string
  title: string
  thumbnailUrl?: string
  badge?: string
  subtitle?: string // date for events, issue # for articles
}

export interface PlanetSectionProps {
  id: string
  label: string
  tagline: string
  accentColor: string
  planetPosition: 'upper-right' | 'lower-left' | 'lower-right'
  moduleCard: ModuleCardData
  illustration?: React.ComponentType
  children?: ReactNode
}
