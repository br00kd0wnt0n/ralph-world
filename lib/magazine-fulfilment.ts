import 'server-only'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import {
  profiles,
  shopifyLinks,
  magazineIssues,
  magazineShipments,
  magazineFulfilmentRuns,
} from '@/lib/db/schema'
import { createMagazineOrder } from '@/lib/shopify/orders'
import { logAction } from '@/lib/audit'

/** A fulfilment run lock is considered stale (abandoned) after this long. */
const RUN_LOCK_TTL_MS = 5 * 60_000

/**
 * Magazine fulfilment batch job — Task 3.9.
 *
 * Given a published magazine issue, creates one Shopify order per
 * active paid subscriber so Shopify can drive the physical fulfilment
 * pipeline. Idempotent: re-running for the same issue skips subscribers
 * who already have a shipment row (any status).
 *
 * Flow:
 *   1. Load issue. Require status='published' + shopifyVariantId.
 *   2. SELECT paid subscribers — profiles.tier='paid' AND a
 *      shopify_links row exists (gives us shopify_customer_id).
 *   3. Filter out subscribers who already have a shipment row for this
 *      issue (idempotency via UNIQUE(user_id, issue_id)).
 *   4. For each remaining subscriber:
 *      a. INSERT magazine_shipments row (status='queued').
 *      b. POST to Shopify Admin /orders.json.
 *      c. UPDATE row → status='shopify_order_created' + shopify_order_id.
 *      d. On Shopify error → UPDATE row → status='failed' + error.
 *   5. Return summary counts.
 *
 * DRY RUN: pass `dryRun: true` to skip steps 4a–d entirely. Returns the
 * eligible-subscriber count so admins can preview before committing.
 *
 * NOT exposed via auth(). Internal-only — call from
 * /api/internal/magazine-fulfilment with the INTERNAL_API_TOKEN header.
 */

export type FulfillmentStatus =
  | 'queued'
  | 'shopify_order_created'
  | 'fulfilled'
  | 'failed'

export interface FulfilIssueInput {
  issueId: string
  dryRun?: boolean
  /** Who triggered the run — threaded from the CMS for the audit trail. */
  actorId?: string | null
}

export interface FulfilIssueResult {
  ok: boolean
  issueNumber: number | null
  eligibleCount: number
  /** Already had a shipment row (any status) — not re-touched. */
  skippedExisting: number
  /** Newly created shipment rows that hit Shopify successfully. */
  ordersCreated: number
  /** Rows that errored on the Shopify call — left as 'failed'. */
  failed: number
  /** Per-error details for the failed rows (max 20). */
  failures: Array<{ userId: string; error: string }>
  dryRun: boolean
  error?: string
}

export async function fulfilIssue(
  input: FulfilIssueInput
): Promise<FulfilIssueResult> {
  const empty: FulfilIssueResult = {
    ok: false,
    issueNumber: null,
    eligibleCount: 0,
    skippedExisting: 0,
    ordersCreated: 0,
    failed: 0,
    failures: [],
    dryRun: Boolean(input.dryRun),
  }

  const db = getDb()

  // ── 1. Load and validate issue ──────────────────────────────
  const [issue] = await db
    .select({
      id: magazineIssues.id,
      issueNumber: magazineIssues.issueNumber,
      status: magazineIssues.status,
      shopifyVariantId: magazineIssues.shopifyVariantId,
    })
    .from(magazineIssues)
    .where(eq(magazineIssues.id, input.issueId))
    .limit(1)

  if (!issue) {
    return { ...empty, error: 'Issue not found' }
  }
  if (issue.status !== 'published') {
    return {
      ...empty,
      issueNumber: issue.issueNumber,
      error: 'Issue is not published. Publish it first.',
    }
  }
  if (!issue.shopifyVariantId) {
    return {
      ...empty,
      issueNumber: issue.issueNumber,
      error: 'Issue has no Shopify variant ID. Add one before fulfilling.',
    }
  }

  // ── 2. SELECT eligible subscribers ──────────────────────────
  // Paid tier AND have a Shopify customer link.
  const eligible = await db
    .select({
      userId: profiles.id,
      shopifyCustomerId: shopifyLinks.shopifyCustomerId,
    })
    .from(profiles)
    .innerJoin(shopifyLinks, eq(shopifyLinks.userId, profiles.id))
    .where(eq(profiles.tier, 'paid'))

  if (eligible.length === 0) {
    return {
      ...empty,
      ok: true,
      issueNumber: issue.issueNumber,
    }
  }

  // ── 3. Filter out subscribers already shipped for this issue ──
  const eligibleIds = eligible.map((e) => e.userId)
  const existing = await db
    .select({ userId: magazineShipments.userId })
    .from(magazineShipments)
    .where(
      and(
        eq(magazineShipments.issueId, issue.id),
        inArray(magazineShipments.userId, eligibleIds)
      )
    )
  const alreadyShippedSet = new Set(existing.map((e) => e.userId))
  const toProcess = eligible.filter((e) => !alreadyShippedSet.has(e.userId))

  const result: FulfilIssueResult = {
    ok: true,
    issueNumber: issue.issueNumber,
    eligibleCount: eligible.length,
    skippedExisting: alreadyShippedSet.size,
    ordersCreated: 0,
    failed: 0,
    failures: [],
    dryRun: Boolean(input.dryRun),
  }

  // Short-circuit on dry run — no DB writes, no Shopify calls, no lock.
  // (Dry runs are metered by the route's per-IP backstop instead.)
  if (input.dryRun) {
    return result
  }

  // ── 3b. Acquire the per-issue run lock (security #3/#7) ───────
  // Insert-or-claim the lock row before any Shopify work. A fresh lock
  // (started < TTL ago, not finished) means a run is already in flight
  // for this issue — refuse, so a leaked token can't spam orders and
  // two operators can't double-fire.
  const lockNow = new Date()
  const claimed = await db
    .insert(magazineFulfilmentRuns)
    .values({
      issueId: issue.id,
      startedAt: lockNow,
      actorId: input.actorId ?? null,
    })
    .onConflictDoNothing({ target: magazineFulfilmentRuns.issueId })
    .returning({ issueId: magazineFulfilmentRuns.issueId })

  if (claimed.length === 0) {
    const [existingLock] = await db
      .select({
        startedAt: magazineFulfilmentRuns.startedAt,
        finishedAt: magazineFulfilmentRuns.finishedAt,
      })
      .from(magazineFulfilmentRuns)
      .where(eq(magazineFulfilmentRuns.issueId, issue.id))
      .limit(1)

    const isFresh =
      existingLock &&
      existingLock.finishedAt === null &&
      lockNow.getTime() - existingLock.startedAt.getTime() < RUN_LOCK_TTL_MS

    if (isFresh) {
      return {
        ...result,
        ok: false,
        error:
          'A fulfilment run for this issue is already in progress. Wait a few minutes and check the counts before retrying.',
      }
    }

    // Stale or already-finished lock — reclaim it for this run.
    await db
      .update(magazineFulfilmentRuns)
      .set({ startedAt: lockNow, finishedAt: null, actorId: input.actorId ?? null })
      .where(eq(magazineFulfilmentRuns.issueId, issue.id))
  }

  // Start-of-run audit row — so a crashed/timed-out run still leaves a
  // trace of who kicked it off, even if the summary row never lands.
  await logAction({
    actorId: input.actorId ?? null,
    action: 'magazine_fulfilment_batch_started',
    targetType: 'magazine_issue',
    targetId: issue.id,
    after: {
      issue_number: issue.issueNumber,
      eligible: result.eligibleCount,
      to_process: toProcess.length,
    },
    source: 'system',
  })

  try {
  // ── 4. Process each eligible subscriber ──────────────────────
  // Sequential rather than parallel. Shopify rate-limits aggressively
  // (~2 req/s for Plus, lower otherwise) and the admin-client already
  // backs off on 429 — going parallel just amplifies retry storms.
  for (const sub of toProcess) {
    // 4a. INSERT shipment row. If the UNIQUE index trips (race with
    // another invocation), skip — that means a parallel run picked
    // this subscriber up already.
    let shipmentId: string | null = null
    try {
      const [row] = await db
        .insert(magazineShipments)
        .values({
          userId: sub.userId,
          issueId: issue.id,
          status: 'queued',
        })
        .returning({ id: magazineShipments.id })
      shipmentId = row.id
    } catch (err) {
      // 23505 unique violation → row exists, treat as skipped
      const code = (err as { code?: string })?.code
      if (code === '23505') {
        result.skippedExisting += 1
        continue
      }
      result.failed += 1
      if (result.failures.length < 20) {
        result.failures.push({
          userId: sub.userId,
          error: err instanceof Error ? err.message : 'DB insert failed',
        })
      }
      continue
    }

    // 4b–c. Shopify order create + mark row.
    try {
      const order = await createMagazineOrder({
        shopifyCustomerId: sub.shopifyCustomerId,
        shopifyVariantId: issue.shopifyVariantId,
        issueNumber: issue.issueNumber,
        shipmentId,
      })

      await db
        .update(magazineShipments)
        .set({
          status: 'shopify_order_created',
          shopifyOrderId: order.shopifyOrderId,
        })
        .where(eq(magazineShipments.id, shipmentId))

      result.ordersCreated += 1
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Shopify order create failed'
      await db
        .update(magazineShipments)
        .set({ status: 'failed', error: message.slice(0, 500) })
        .where(eq(magazineShipments.id, shipmentId))

      result.failed += 1
      if (result.failures.length < 20) {
        result.failures.push({ userId: sub.userId, error: message })
      }
    }
  }

  // ── 5. Summary audit ────────────────────────────────────────
  await logAction({
    actorId: input.actorId ?? null,
    action: 'magazine_fulfilment_batch_run',
    targetType: 'magazine_issue',
    targetId: issue.id,
    after: {
      issue_number: issue.issueNumber,
      eligible: result.eligibleCount,
      skipped_existing: result.skippedExisting,
      orders_created: result.ordersCreated,
      failed: result.failed,
    },
    source: 'system',
  })

  return result
  } finally {
    // Release the lock so a later run (retry of failures, next issue
    // cycle) isn't blocked. Best-effort — a failed release just means the
    // lock expires naturally after RUN_LOCK_TTL_MS.
    try {
      await db
        .update(magazineFulfilmentRuns)
        .set({ finishedAt: new Date() })
        .where(eq(magazineFulfilmentRuns.issueId, issue.id))
    } catch (err) {
      console.error('[magazine-fulfilment] failed to release run lock', err)
    }
  }
}

/**
 * Snapshot of per-status shipment counts for an issue. Used by the CMS
 * to render the fulfilment panel summary.
 */
export interface IssueShipmentSummary {
  queued: number
  shopifyOrderCreated: number
  fulfilled: number
  failed: number
  total: number
}

export async function getIssueShipmentSummary(
  issueId: string
): Promise<IssueShipmentSummary> {
  const empty: IssueShipmentSummary = {
    queued: 0,
    shopifyOrderCreated: 0,
    fulfilled: 0,
    failed: 0,
    total: 0,
  }
  try {
    const db = getDb()
    const rows = await db
      .select({
        status: magazineShipments.status,
        n: sql<number>`count(*)::int`,
      })
      .from(magazineShipments)
      .where(eq(magazineShipments.issueId, issueId))
      .groupBy(magazineShipments.status)

    const out = { ...empty }
    for (const r of rows) {
      const n = Number(r.n) || 0
      out.total += n
      switch (r.status) {
        case 'queued':
          out.queued = n
          break
        case 'shopify_order_created':
          out.shopifyOrderCreated = n
          break
        case 'fulfilled':
          out.fulfilled = n
          break
        case 'failed':
          out.failed = n
          break
      }
    }
    return out
  } catch {
    return empty
  }
}
