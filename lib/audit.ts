import 'server-only'
import { getDb } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'

/**
 * Audit log — sensitive-mutation trail (architecture doc §13).
 *
 * Append-only. The `ralph_world` DB role has INSERT but no UPDATE / DELETE
 * permission on audit_log (enforced in Task 1.2). Callers treat this as
 * fire-and-forget: every write is wrapped in try/catch so audit failures
 * never break the user-facing operation. Failures land in stderr and the
 * underlying issue (DB down, bad payload) is the real bug to fix.
 *
 * Common actions logged:
 *   role_changed, sub_status_changed, email_changed, account_deleted,
 *   shopify_link_created, magazine_shopify_order_created,
 *   magazine_shipment_fulfilled, magazine_shipment_failed,
 *   webhook_received
 */

export type AuditSource = 'system' | 'cms' | 'portal' | 'webhook'

export interface LogActionInput {
  /** User performing the action. null = system / post-erasure record. */
  actorId?: string | null
  /** Short snake_case verb. See module doc for common values. */
  action: string
  /** What entity was affected — e.g. 'user', 'profile', 'subscription', 'shopify_customer'. */
  targetType?: string | null
  /** Primary key of the affected entity (UUID, Stripe id, etc.). */
  targetId?: string | null
  /** Snapshot of state before the change (jsonb). Optional. */
  before?: unknown
  /** Snapshot of state after the change (jsonb). Optional. */
  after?: unknown
  /** Where the action originated. */
  source: AuditSource
}

export async function logAction(input: LogActionInput): Promise<void> {
  try {
    const db = getDb()
    await db.insert(auditLog).values({
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      source: input.source,
    })
  } catch (err) {
    // Audit must never break the calling flow. Log + carry on.
    console.error('[audit] failed to write audit_log row:', err)
  }
}
