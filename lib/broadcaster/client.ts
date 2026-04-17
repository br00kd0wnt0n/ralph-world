import type { RelayStatus, BroadcasterAsset, ScheduleItem } from './types'

const TIMEOUT_MS = 3000

// Channel/week are fixed today because the broadcaster stores schedules
// under (channel, week, day) and we only have one channel on one "current"
// week. When the broadcaster gets multi-week support, swap WEEK for a real
// week key (e.g. ISO week string) and compute dayName relative to that.
const CHANNEL = 'default'
const WEEK = 'current'

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

function getAuthHeaders(): HeadersInit {
  const token = process.env.BROADCASTER_SERVICE_TOKEN
  return token ? { 'X-Service-Token': token } : {}
}

/**
 * Get live stream status. Returns { streaming: false, available: false } on any error.
 * Never throws — used in homepage data fetch where failure must not break the page.
 */
export async function getRelayStatus(): Promise<RelayStatus> {
  const url = process.env.BROADCASTER_BACKEND_URL
  if (!url) return { streaming: false, available: false }

  try {
    const res = await fetchWithTimeout(`${url}/api/relay/status`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return { streaming: false, available: false }
    const data = await res.json()
    return {
      streaming: Boolean(data.streaming),
      available: Boolean(data.available),
    }
  } catch {
    return { streaming: false, available: false }
  }
}

interface RawPlaylistItem {
  assetId: string
  durationSec: number
  vimeoId: string | null
  normStatus?: string
}

interface RawPlaylistResponse {
  playbackMode: 'loop' | 'playthru'
  playStart: string // "HH:MM"
  items: RawPlaylistItem[]
}

// Ports backend/src/feed.js:computePointer — given loop mode, play start,
// and durations, returns which item is playing right now and how far into it.
function computePointer(
  mode: 'loop' | 'playthru',
  playStart: string,
  durationsSec: number[],
  now: Date
): { index: number; offsetSec: number; ended?: boolean } {
  const total = durationsSec.reduce((a, b) => a + (b || 0), 0)
  if (!total) return { index: 0, offsetSec: 0 }

  const [hh, mm] = playStart.split(':').map((n) => parseInt(n || '0', 10))
  const start = new Date(now)
  start.setHours(hh || 0, mm || 0, 0, 0)
  let delta = Math.floor((now.getTime() - start.getTime()) / 1000)

  if (mode === 'playthru') {
    if (delta < 0) return { index: 0, offsetSec: 0 }
    if (delta >= total) {
      return {
        ended: true,
        index: durationsSec.length - 1,
        offsetSec: durationsSec.at(-1) || 0,
      }
    }
  }
  if (delta < 0) delta = ((delta % total) + total) % total
  const t = mode === 'loop' ? delta % total : delta

  let acc = 0
  for (let i = 0; i < durationsSec.length; i++) {
    const d = durationsSec[i] || 0
    if (t < acc + d) return { index: i, offsetSec: t - acc }
    acc += d
  }
  return { index: durationsSec.length - 1, offsetSec: 0 }
}

function formatHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// Strip common video extensions so "Dexter.mp4" → "Dexter".
function cleanAssetName(filename: string): string {
  return filename.replace(/\.(mp4|mov|mkv|webm|m4v)$/i, '').trim()
}

/**
 * Get today's schedule from the Broadcaster, enriched with show names and
 * wall-clock times computed from the current loop pointer. Returns an ordered
 * list starting with the currently-playing item. Empty array on any error.
 */
export async function getSchedule(
  now: Date = new Date()
): Promise<ScheduleItem[]> {
  const url = process.env.BROADCASTER_BACKEND_URL
  if (!url) return []

  try {
    const day = DAY_NAMES[now.getDay()]
    const [playlistRes, assets] = await Promise.all([
      fetchWithTimeout(
        `${url}/feed/${CHANNEL}/${WEEK}/${day}/playlist`,
        { headers: getAuthHeaders() }
      ),
      getAssets(),
    ])

    if (!playlistRes.ok) return []
    const data = (await playlistRes.json()) as RawPlaylistResponse
    const items = data.items ?? []
    if (items.length === 0) return []

    const assetById = new Map(assets.map((a) => [a.id, a]))
    const durations = items.map((it) => it.durationSec || 0)
    const { index: currentIdx } = computePointer(
      data.playbackMode,
      data.playStart,
      durations,
      now
    )

    // Anchor wall-clock times to the start of the CURRENT loop iteration,
    // then roll forward. For 'playthru', anchor to playStart.
    const [hh, mm] = data.playStart.split(':').map((n) => parseInt(n || '0', 10))
    const loopStart = new Date(now)
    loopStart.setHours(hh || 0, mm || 0, 0, 0)

    const total = durations.reduce((a, b) => a + b, 0)
    let iterStart = loopStart
    if (data.playbackMode === 'loop' && total > 0) {
      const deltaSec = Math.floor((now.getTime() - loopStart.getTime()) / 1000)
      const iterations = Math.floor(deltaSec / total)
      iterStart = new Date(loopStart.getTime() + iterations * total * 1000)
    }

    // Start times for item 0 of the current iteration, accumulating from there.
    const result: ScheduleItem[] = []
    const n = items.length
    // Return up to 20 items ahead (or wrap once around the loop) so the
    // Schedule overlay has enough to show without scrolling forever.
    const maxItems = Math.min(20, data.playbackMode === 'loop' ? n : n - currentIdx)

    for (let step = 0; step < maxItems; step++) {
      const i = (currentIdx + step) % n
      const iteration = Math.floor((currentIdx + step) / n)
      // Cumulative duration from start of THIS iteration to start of item i.
      let cum = 0
      for (let k = 0; k < i; k++) cum += durations[k]
      const startMs =
        iterStart.getTime() + iteration * total * 1000 + cum * 1000
      const endMs = startMs + durations[i] * 1000

      const asset = assetById.get(items[i].assetId)
      const name = asset?.title ?? 'Untitled'

      result.push({
        startTime: formatHHMM(new Date(startMs)),
        endTime: formatHHMM(new Date(endMs)),
        showName: name,
      })
    }

    return result
  } catch {
    return []
  }
}

interface RawAsset {
  id: string
  file_name?: string
  duration_sec?: number
  thumbnail_url?: string | null
}

function normalizeAsset(raw: RawAsset): BroadcasterAsset {
  const title = cleanAssetName(raw.file_name ?? 'Untitled')
  return {
    id: raw.id,
    file_name: raw.file_name ?? '',
    duration_sec: raw.duration_sec ?? 0,
    thumbnail_url: raw.thumbnail_url ?? null,
    title,
    duration: raw.duration_sec ?? 0,
    thumbnailUrl: raw.thumbnail_url ?? null,
  }
}

/**
 * Get VOD asset library. Returns empty array on error.
 */
export async function getAssets(): Promise<BroadcasterAsset[]> {
  const url = process.env.BROADCASTER_BACKEND_URL
  if (!url) return []

  try {
    const res = await fetchWithTimeout(`${url}/assets`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) return []
    const data = await res.json()
    const list: RawAsset[] = Array.isArray(data) ? data : (data.assets ?? [])
    return list.map(normalizeAsset)
  } catch {
    return []
  }
}

/**
 * Get presigned VOD URL (10min TTL). Null on error.
 */
export async function getVodUrl(assetId: string): Promise<string | null> {
  const url = process.env.BROADCASTER_BACKEND_URL
  if (!url) return null

  try {
    const res = await fetchWithTimeout(
      `${url}/assets/${assetId}/presigned`,
      { headers: getAuthHeaders() }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
  } catch {
    return null
  }
}
