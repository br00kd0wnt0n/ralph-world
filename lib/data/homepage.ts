import { getDb } from '@/lib/db'
import { articles, events, labItems, homepageConfig } from '@/lib/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import type { ModuleItem } from '@/components/home/PlanetSection'
import { getSchedule } from '@/lib/broadcaster/client'
import { getAllProducts } from '@/lib/shopify/client'

async function getTVItems(): Promise<ModuleItem[]> {
  try {
    const schedule = await getSchedule()
    if (!schedule.length) return []
    return schedule.slice(0, 4).map((s, i) => ({
      id: `tv-${i}-${s.startTime}-${s.assetId ?? s.showName}`,
      title: s.showName,
      thumbnailUrl: s.thumbnailUrl ?? undefined,
      badge: i === 0 ? 'ON NOW' : i === 1 ? 'UP NEXT' : undefined,
      subtitle: `${s.startTime}–${s.endTime}`,
    }))
  } catch {
    return []
  }
}

export type PlanetModuleKey = 'tv' | 'magazine' | 'events' | 'shop' | 'lab'
export type PlanetImages = Record<PlanetModuleKey, string | null>

const PLANET_MODULE_KEYS: PlanetModuleKey[] = [
  'tv',
  'magazine',
  'events',
  'shop',
  'lab',
]

export async function getPlanetImages(): Promise<PlanetImages> {
  const base: PlanetImages = {
    tv: null,
    magazine: null,
    events: null,
    shop: null,
    lab: null,
  }
  try {
    const db = getDb()
    const rows = await db
      .select({ key: homepageConfig.key, value: homepageConfig.value })
      .from(homepageConfig)
      .where(
        inArray(
          homepageConfig.key,
          PLANET_MODULE_KEYS.map((k) => `planet_${k}_url`)
        )
      )
    for (const r of rows) {
      const match = r.key.match(/^planet_(\w+)_url$/)
      if (!match) continue
      const mod = match[1] as PlanetModuleKey
      if (!PLANET_MODULE_KEYS.includes(mod)) continue
      if (typeof r.value === 'string' && r.value.trim()) {
        base[mod] = r.value.trim()
      }
    }
  } catch {
    // keep defaults
  }
  return base
}

type PickMap = Record<string, string[]>

async function readPicks(): Promise<PickMap> {
  try {
    const db = getDb()
    const rows = await db
      .select({ key: homepageConfig.key, value: homepageConfig.value })
      .from(homepageConfig)
      .where(
        inArray(homepageConfig.key, [
          'home_magazine_picks',
          'home_events_picks',
          'home_lab_picks',
          'home_shop_picks',
        ])
      )
    const out: PickMap = {}
    for (const r of rows) {
      if (Array.isArray(r.value)) {
        out[r.key] = r.value.filter((v): v is string => typeof v === 'string')
      }
    }
    return out
  } catch {
    return {}
  }
}

// Re-order DB rows to match the picks order, dropping anything missing.
function orderByIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter((x): x is T => Boolean(x))
}

export async function getHomepageData() {
  try {
    const db = getDb()
    const picks = await readPicks()

    const magPickIds = picks['home_magazine_picks'] ?? []
    const eventPickIds = picks['home_events_picks'] ?? []
    const labPickIds = picks['home_lab_picks'] ?? []
    const shopPickHandles = picks['home_shop_picks'] ?? []

    const [magazineRows, eventRows, labRows, tvItems] = await Promise.all([
      magPickIds.length > 0
        ? db
            .select({
              id: articles.id,
              title: articles.title,
              issueNumber: articles.issueNumber,
              leadMediaUrl: articles.leadMediaUrl,
            })
            .from(articles)
            .where(inArray(articles.id, magPickIds))
            .then((rows) => orderByIds(rows, magPickIds))
        : db
            .select({
              id: articles.id,
              title: articles.title,
              issueNumber: articles.issueNumber,
              leadMediaUrl: articles.leadMediaUrl,
            })
            .from(articles)
            .where(eq(articles.status, 'published'))
            .orderBy(desc(articles.publishedAt))
            .limit(2),

      eventPickIds.length > 0
        ? db
            .select({
              id: events.id,
              title: events.title,
              eventDate: events.eventDate,
              thumbnailUrl: events.thumbnailUrl,
              badge: events.badge,
            })
            .from(events)
            .where(inArray(events.id, eventPickIds))
            .then((rows) => orderByIds(rows, eventPickIds))
        : db
            .select({
              id: events.id,
              title: events.title,
              eventDate: events.eventDate,
              thumbnailUrl: events.thumbnailUrl,
              badge: events.badge,
            })
            .from(events)
            .where(eq(events.status, 'published'))
            .orderBy(desc(events.eventDate))
            .limit(1),

      labPickIds.length > 0
        ? db
            .select({
              id: labItems.id,
              title: labItems.title,
              thumbnailUrl: labItems.thumbnailUrl,
              badge: labItems.badge,
            })
            .from(labItems)
            .where(inArray(labItems.id, labPickIds))
            .then((rows) => orderByIds(rows, labPickIds))
        : db
            .select({
              id: labItems.id,
              title: labItems.title,
              thumbnailUrl: labItems.thumbnailUrl,
              badge: labItems.badge,
            })
            .from(labItems)
            .where(eq(labItems.status, 'published'))
            .orderBy(desc(labItems.publishedAt))
            .limit(1),

      getTVItems(),
    ])

    const magazineItems: ModuleItem[] = magazineRows.map((a, i) => ({
      id: a.id,
      title: a.title ?? 'Untitled',
      thumbnailUrl: a.leadMediaUrl ?? undefined,
      badge: i === 0 ? 'NEW' : undefined,
      subtitle: a.issueNumber ? `Issue #${a.issueNumber}` : undefined,
    }))

    const eventItems: ModuleItem[] = eventRows.map((e) => ({
      id: e.id,
      title: e.title ?? 'Untitled',
      thumbnailUrl: e.thumbnailUrl ?? undefined,
      badge: e.badge ?? undefined,
      subtitle: e.eventDate
        ? e.eventDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : undefined,
    }))

    const labItemsList: ModuleItem[] = labRows.map((l) => ({
      id: l.id,
      title: l.title ?? 'Untitled',
      thumbnailUrl: l.thumbnailUrl ?? undefined,
      badge: l.badge ?? 'FRESH',
    }))

    // Shop: only explicit picks. No "recent products" fallback — shop items
    // aren't time-ordered meaningfully, so we don't want random picks.
    const shopItems: ModuleItem[] = await getShopItems(shopPickHandles)

    return {
      magazineItems,
      eventItems,
      labItems: labItemsList,
      tvItems,
      shopItems,
    }
  } catch {
    return {
      magazineItems: [
        { id: '1', title: 'Coming soon...', badge: 'NEW' },
        { id: '2', title: 'More stories on the way' },
      ] as ModuleItem[],
      eventItems: [
        { id: '1', title: 'Events coming soon', subtitle: 'TBC' },
      ] as ModuleItem[],
      labItems: [
        { id: '1', title: 'Lab experiments loading...', badge: 'FRESH' },
      ] as ModuleItem[],
      tvItems: await getTVItems(),
      shopItems: [] as ModuleItem[],
    }
  }
}

async function getShopItems(handles: string[]): Promise<ModuleItem[]> {
  if (handles.length === 0) return []
  try {
    const products = await getAllProducts(100)
    const byHandle = new Map(products.map((p) => [p.handle, p]))
    return handles
      .map((h) => byHandle.get(h))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: p.id,
        title: p.title,
        thumbnailUrl: p.imageUrl ?? undefined,
        badge: p.available ? undefined : 'SOLD OUT',
        subtitle: `${p.price} ${p.currency}`,
      }))
  } catch {
    return []
  }
}
