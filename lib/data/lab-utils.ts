const FRESH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function isFresh(publishedAt: Date | string | null): boolean {
  if (!publishedAt) return false
  const d = publishedAt instanceof Date ? publishedAt : new Date(publishedAt)
  return Date.now() - d.getTime() < FRESH_WINDOW_MS
}
