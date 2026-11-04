import 'server-only'
import { eq, inArray, min } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  homepageConfig,
  magazineFulfilmentRuns,
  magazineIssues,
  magazineShipments,
} from '@/lib/db/schema'
import { pickFirstIssue, type FirstIssue } from './first-issue'

/** CMS Site Copy key: completes "We expect to post it …". */
export const NEXT_ISSUE_ETA_KEY = 'magazine_next_issue_eta'

/**
 * The first print issue a subscriber joining now will receive, plus
 * whether this user has had copies before (a returning subscriber).
 * See ./first-issue.ts for the rule.
 */
export async function getFirstIssueForSubscriber(
  userId: string
): Promise<(FirstIssue & { returning: boolean }) | null> {
  const db = getDb()
  const [issues, runs, shipped, etaRows, own] = await Promise.all([
    db
      .select({ id: magazineIssues.id, issueNumber: magazineIssues.issueNumber, title: magazineIssues.title })
      .from(magazineIssues),
    db
      .select({ issueId: magazineFulfilmentRuns.issueId, startedAt: magazineFulfilmentRuns.startedAt })
      .from(magazineFulfilmentRuns),
    // Older runs may predate the runs table: first successful shipment.
    db
      .select({ issueId: magazineShipments.issueId, first: min(magazineShipments.createdAt) })
      .from(magazineShipments)
      .where(inArray(magazineShipments.status, ['shopify_order_created', 'fulfilled']))
      .groupBy(magazineShipments.issueId),
    db
      .select({ value: homepageConfig.value })
      .from(homepageConfig)
      .where(eq(homepageConfig.key, NEXT_ISSUE_ETA_KEY))
      .limit(1),
    db
      .select({ id: magazineShipments.id })
      .from(magazineShipments)
      .where(eq(magazineShipments.userId, userId))
      .limit(1),
  ])

  const runAt = new Map(runs.map((r) => [r.issueId, r.startedAt]))
  const shippedAt = new Map(shipped.map((s) => [s.issueId, s.first]))
  const etaValue = etaRows[0]?.value
  const picked = pickFirstIssue(
    issues.map((i) => ({
      issueNumber: i.issueNumber,
      title: i.title,
      fulfilledAt: runAt.get(i.id) ?? shippedAt.get(i.id) ?? null,
    })),
    typeof etaValue === 'string' ? etaValue : null
  )
  return picked ? { ...picked, returning: own.length > 0 } : null
}
