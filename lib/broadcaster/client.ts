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
    // Broadcaster data (schedule pointer, live status, asset list) is
    // real-time — never let Next's fetch cache serve a stale response.
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      signal: controller.signal,
    })
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

// The broadcaster stores playStart as an "HH:MM" wall-clock time in
// LONDON. Railway runs its containers in UTC, so a naive
// `date.setHours(9, 0)` interprets it as UTC 09:00 — an hour off in
// summer (BST), zero in winter. This helper resolves the London wall
// clock to a real UTC millisecond so pointer maths line up with what the
// live stream is actually playing. Iterative approach (same trick as
// londonWallToLocalWall in lib/tv/time.ts): guess UTC ms, format back
// in London, adjust, repeat. Converges in 1–2 steps.
function londonHHMMTodayToUtcMs(hhmm: string, referenceMs: number): number {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n || '0', 10))
  const targetH = h || 0
  const targetM = m || 0

  // Today's calendar date in London (may differ from server's UTC day).
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(referenceMs))
  const y = Number(dateParts.find((p) => p.type === 'year')!.value)
  const mo = Number(dateParts.find((p) => p.type === 'month')!.value)
  const d = Number(dateParts.find((p) => p.type === 'day')!.value)

  let guessMs = Date.UTC(y, mo - 1, d, targetH, targetM)
  const targetTotal = targetH * 60 + targetM
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(guessMs))
    const gotH = Number(parts.find((p) => p.type === 'hour')!.value)
    const gotM = Number(parts.find((p) => p.type === 'minute')!.value)
    const gotTotal = gotH * 60 + gotM
    let diff = targetTotal - gotTotal
    if (diff > 12 * 60) diff -= 24 * 60
    if (diff < -12 * 60) diff += 24 * 60
    if (diff === 0) break
    guessMs += diff * 60_000
  }
  return guessMs
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

  const startMs = londonHHMMTodayToUtcMs(playStart, now.getTime())
  let delta = Math.floor((now.getTime() - startMs) / 1000)

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

// Format a UTC millisecond epoch as HH:MM in London wall clock. Consumer
// (client) reinterprets these as London and shifts to the viewer's TZ,
// so we MUST output London-relative here.
function formatHHMMInLondon(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms))
}

// Strip common video extensions so "Dexter.mp4" → "Dexter".
function cleanAssetName(filename: string): string {
  return filename.replace(/\.(mp4|mov|mkv|webm|m4v)$/i, '').trim()
}

interface BroadcasterStatus {
  day?: string
  index?: number
  offsetSec?: number
  ended?: boolean
  item?: { assetId?: string; name?: string; durationSec?: number } | null
}

// Ask the broadcaster where its own pointer actually is right now.
// This is the source of truth — the broadcaster's stream is driven from
// this same maths, so any positional derivation on our side that doesn't
// use this will drift under real conditions (TZ mismatch, stream restart,
// clock skew, playlist edits mid-loop). Returns null on any failure so
// getSchedule can fall back to local computation.
async function getBroadcasterStatus(
  now: Date
): Promise<BroadcasterStatus | null> {
  const url = process.env.BROADCASTER_BACKEND_URL
  if (!url) return null
  try {
    const day = DAY_NAMES[now.getDay()]
    const res = await fetchWithTimeout(
      `${url}/status/${CHANNEL}/${WEEK}/${day}`,
      { headers: getAuthHeaders() }
    )
    if (!res.ok) return null
    return (await res.json()) as BroadcasterStatus
  } catch {
    return null
  }
}

/**
 * Get today's schedule from the Broadcaster, enriched with show names and
 * wall-clock times anchored to the broadcaster's own pointer. Returns an
 * ordered list starting with the currently-playing item. Empty array on
 * any error.
 *
 * Anchoring off /status (not off local `computePointer` against playStart)
 * is what stops the schedule strip drifting against the actual stream.
 * The broadcaster resolves `play_start` in the container's local TZ (UTC
 * on Railway); we used to resolve it as Europe/London — a 60-min mismatch
 * mod loop-length in BST. Even without the TZ bug, local derivation
 * would drift across any stream restart or mid-loop playlist edit.
 */
export async function getSchedule(
  now: Date = new Date()
): Promise<ScheduleItem[]> {
  const url = process.env.BROADCASTER_BACKEND_URL
  if (!url) return []

  try {
    const day = DAY_NAMES[now.getDay()]
    const [playlistRes, assets, status] = await Promise.all([
      fetchWithTimeout(
        `${url}/feed/${CHANNEL}/${WEEK}/${day}/playlist`,
        { headers: getAuthHeaders() }
      ),
      getAssets(),
      getBroadcasterStatus(now),
    ])

    if (!playlistRes.ok) return []
    const data = (await playlistRes.json()) as RawPlaylistResponse
    const items = data.items ?? []
    if (items.length === 0) return []

    const assetById = new Map(assets.map((a) => [a.id, a]))
    const durations = items.map((it) => it.durationSec || 0)

    // Prefer the broadcaster's authoritative pointer; fall back to local
    // derivation if /status is unavailable (network error, older
    // broadcaster build, missing token) so the strip stays populated
    // rather than empty.
    let currentIdx: number
    let currentOffsetSec: number
    if (
      status &&
      typeof status.index === 'number' &&
      typeof status.offsetSec === 'number'
    ) {
      currentIdx = Math.max(0, Math.min(items.length - 1, status.index))
      currentOffsetSec = Math.max(0, status.offsetSec)
    } else {
      const ptr = computePointer(data.playbackMode, data.playStart, durations, now)
      currentIdx = ptr.index
      currentOffsetSec = ptr.offsetSec
    }

    // Anchor: when did the current item start? That's `now - offsetSec`.
    // Every subsequent item follows in order, wrapping the loop as needed.
    const currentItemStartMs = now.getTime() - currentOffsetSec * 1000

    // Skip stingers / idents / bumpers from the schedule display. Under
    // 60s of duration the item renders as e.g. "16:00-16:00" in HH:MM
    // and clutters the overlay. Anything the audience actually watches
    // as a "show" is well over a minute.
    const STINGER_MAX_SECS = 60

    const result: ScheduleItem[] = []
    const n = items.length
    // Return up to 20 items ahead (or one pass through the playlist for
    // playthru) so the Schedule overlay has enough to show without
    // scrolling forever.
    const maxItems = Math.min(20, data.playbackMode === 'loop' ? n : n - currentIdx)

    // Walk forward from the current item, accumulating durations. We walk
    // the FULL playlist (including stingers) so wall-clock times stay
    // exact, then filter stingers out of the returned display list.
    let cursorMs = currentItemStartMs
    for (let step = 0; step < maxItems; step++) {
      const i = (currentIdx + step) % n
      const startMs = cursorMs
      const endMs = startMs + durations[i] * 1000
      cursorMs = endMs

      if ((durations[i] ?? 0) < STINGER_MAX_SECS) continue

      const asset = assetById.get(items[i].assetId)
      const name = asset?.title ?? 'Untitled'

      result.push({
        startTime: formatHHMMInLondon(startMs),
        endTime: formatHHMMInLondon(endMs),
        showName: name,
        description: asset?.description ?? undefined,
        assetId: items[i].assetId,
        thumbnailUrl: asset?.thumbnailUrl ?? null,
      })

      // Guard: for playthru mode with a huge playlist, don't walk past
      // the natural end. (Loop mode wraps via i = (idx+step) % n above.)
      if (data.playbackMode === 'playthru' && step >= n - 1 - currentIdx) break
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
  description?: string | null
}

function normalizeAsset(raw: RawAsset): BroadcasterAsset {
  const title = cleanAssetName(raw.file_name ?? 'Untitled')
  return {
    id: raw.id,
    file_name: raw.file_name ?? '',
    duration_sec: raw.duration_sec ?? 0,
    thumbnail_url: raw.thumbnail_url ?? null,
    description:
      typeof raw.description === 'string' && raw.description.trim().length > 0
        ? raw.description
        : null,
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
