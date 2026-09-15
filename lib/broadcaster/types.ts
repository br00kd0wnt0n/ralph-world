export interface RelayStatus {
  streaming: boolean
  available: boolean
}

export type ContentAspect = 'portrait' | 'landscape'

export interface ScheduleItem {
  startTime: string
  endTime: string
  showName: string
  description?: string
  assetId?: string
  thumbnailUrl?: string | null
  /** Source orientation of the clip (rotation-aware, probed by the broadcaster's
   *  transcoder). Portrait clips are pillarboxed into the 16:9 stream, so the
   *  player zooms to the strip on a portrait phone. null = not probed yet. */
  aspect?: ContentAspect | null
  srcWidth?: number | null
  srcHeight?: number | null
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
  /** Editor-authored show blurb from the broadcaster admin. Null when
   *  the editor hasn't set one — consumers should hide the description
   *  slot in that case rather than showing an empty string. */
  description: string | null
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

/**
 * Authoritative now-playing from the broadcaster backend's GET /now-playing.
 * Reflects what the streamer is ACTUALLY playing (not a time-of-day estimate),
 * so it always matches the live stream.
 */
export interface NowPlayingResult {
  streaming: boolean
  current: ScheduleItem | null
  next: ScheduleItem | null
}
