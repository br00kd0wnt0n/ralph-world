import { getDb } from '@/lib/db'
import { articles, events, labItems } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { ModuleItem } from '@/components/home/PlanetSection'
import { getSchedule } from '@/lib/broadcaster/client'

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

export async function getHomepageData() {
  try {
    const db = getDb()

    const [magazineRows, eventRows, labRows, tvItems] = await Promise.all([
      db
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

      db
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

      db
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

    return { magazineItems, eventItems, labItems: labItemsList, tvItems }
  } catch {
    // DB not available — return empty placeholder data. TV comes from the
    // broadcaster (not the DB), so try it independently.
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
    }
  }
}
