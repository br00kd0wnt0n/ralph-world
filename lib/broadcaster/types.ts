export interface RelayStatus {
  streaming: boolean
  available: boolean
}

export interface ScheduleItem {
  startTime: string
  endTime: string
  showName: string
  description?: string
  assetId?: string
  thumbnailUrl?: string | null
}

// Shape returned by GET /assets on the broadcaster backend. Field names
// mirror the DB column names (snake_case) since the broadcaster returns
// them as-is. `title` / `duration` / `thumbnailUrl` are camelCase aliases
// populated by getAssets() for consumers that want the tidier shape.
export interface BroadcasterAsset {
  id: string
  file_name: string
  duration_sec: number
  thumbnail_url: string | null
  // Camel-case aliases for backward compatibility with code that expects them.
  title: string
  duration: number
  thumbnailUrl?: string | null
}

export interface LiveState {
  status: 'live' | 'offline' | 'loading'
  current?: ScheduleItem
  next?: ScheduleItem
}
