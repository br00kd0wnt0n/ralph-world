import type { RelayStatus, BroadcasterAsset, ScheduleItem } from './types'

const TIMEOUT_MS = 3000

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

/**
 * Get today's schedule from Broadcaster. Returns empty array on error.
 */
export async function getSchedule(): Promise<ScheduleItem[]> {
  const url = process.env.BROADCASTER_BACKEND_URL
  if (!url) return []

  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await fetchWithTimeout(
      `${url}/feed/default/current/${today}/playlist`,
      { headers: getAuthHeaders() }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : (data.items ?? [])
  } catch {
    return []
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
    return Array.isArray(data) ? data : (data.assets ?? [])
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
