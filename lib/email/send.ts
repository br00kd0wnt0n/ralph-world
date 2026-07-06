import 'server-only'
import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { getDb } from '@/lib/db'
import { emailEvents } from '@/lib/db/schema'
import type { ReactElement } from 'react'

/**
 * Transactional email send service — architecture doc §10.
 *
 * `sendTemplate(input)` is the single entrypoint for all transactional
 * email. It computes an idempotency key from `(userId, templateId,
 * contextHash)`, records a `send_attempted` row in email_events with that
 * key, and ONLY THEN calls Resend. A duplicate call with the same key
 * is a no-op — the INSERT hits the unique index, we catch the conflict,
 * and skip the Resend call entirely.
 *
 * Templates live in `components/emails/` as React Email components. The
 * registry below maps templateId → { subject, render } so the call site
 * doesn't import templates directly.
 *
 * Failure semantics:
 * - DB unavailable → throws (caller decides — usually retry).
 * - Resend rejects → email_events row stays at 'send_attempted' (no
 *   'sent' event written). Caller may retry with a DIFFERENT
 *   idempotency key once the bug is fixed.
 * - Duplicate key → returns { skipped: true } without hitting Resend.
 */

// ── Template registry ──────────────────────────────────────────────────

import { EmailVerification } from '@/components/emails/EmailVerification'
import { SubscriptionReceipt } from '@/components/emails/SubscriptionReceipt'
import { SubscriptionCancelled } from '@/components/emails/SubscriptionCancelled'
import { SubscriptionCancelScheduled } from '@/components/emails/SubscriptionCancelScheduled'
import { PaymentFailed } from '@/components/emails/PaymentFailed'
import { EventRsvp } from '@/components/emails/EventRsvp'
import { MagazineShipped } from '@/components/emails/MagazineShipped'
import { PasswordReset } from '@/components/emails/PasswordReset'
import { ContactJpNotification } from '@/components/emails/ContactJpNotification'

export type TemplateId =
  | 'email-verification'
  | 'subscription-receipt'
  | 'subscription-cancelled'
  | 'subscription-cancel-scheduled'
  | 'payment-failed'
  | 'event-rsvp'
  | 'magazine-shipped'
  | 'password-reset'
  | 'contact-jp-notification'

interface TemplateEntry<P> {
  subject: (props: P) => string
  render: (props: P) => ReactElement
}

const TEMPLATES = {
  'email-verification': {
    subject: () => 'Verify your Ralph.world email',
    render: (props: { verificationUrl: string; recipientName?: string | null }) =>
      EmailVerification(props),
  } as TemplateEntry<{ verificationUrl: string; recipientName?: string | null }>,

  'subscription-receipt': {
    subject: () => "You're now a Ralph subscriber",
    render: (props: {
      recipientName?: string | null
      periodEnd: string
      amount: string
      manageUrl: string
    }) => SubscriptionReceipt(props),
  } as TemplateEntry<{
    recipientName?: string | null
    periodEnd: string
    amount: string
    manageUrl: string
  }>,

  'subscription-cancelled': {
    subject: () => 'Your Ralph subscription has ended',
    render: (props: {
      recipientName?: string | null
      endedOn: string
      resubscribeUrl: string
    }) => SubscriptionCancelled(props),
  } as TemplateEntry<{
    recipientName?: string | null
    endedOn: string
    resubscribeUrl: string
  }>,

  'subscription-cancel-scheduled': {
    subject: () => 'Cancellation scheduled — Ralph.world',
    render: (props: {
      recipientName?: string | null
      accessUntil: string
      reactivateUrl: string
    }) => SubscriptionCancelScheduled(props),
  } as TemplateEntry<{
    recipientName?: string | null
    accessUntil: string
    reactivateUrl: string
  }>,

  'payment-failed': {
    subject: () => 'Action needed: your Ralph payment failed',
    render: (props: { recipientName?: string | null; updatePaymentUrl: string }) =>
      PaymentFailed(props),
  } as TemplateEntry<{ recipientName?: string | null; updatePaymentUrl: string }>,

  'event-rsvp': {
    subject: (props: { eventTitle: string }) => `You're going to ${props.eventTitle}`,
    render: (props: {
      recipientName?: string | null
      eventTitle: string
      eventDate: string
      eventLocation?: string | null
      eventUrl: string
    }) => EventRsvp(props),
  } as TemplateEntry<{
    recipientName?: string | null
    eventTitle: string
    eventDate: string
    eventLocation?: string | null
    eventUrl: string
  }>,

  'magazine-shipped': {
    subject: (props: { issueTitle: string }) => `Your Ralph magazine is on its way — ${props.issueTitle}`,
    render: (props: {
      recipientName?: string | null
      issueTitle: string
      trackingUrl?: string | null
      shippingAddress?: string | null
    }) => MagazineShipped(props),
  } as TemplateEntry<{
    recipientName?: string | null
    issueTitle: string
    trackingUrl?: string | null
    shippingAddress?: string | null
  }>,

  'password-reset': {
    subject: () => 'Reset your Ralph.world password',
    render: (props: { resetUrl: string; recipientName?: string | null }) =>
      PasswordReset(props),
  } as TemplateEntry<{ resetUrl: string; recipientName?: string | null }>,

  'contact-jp-notification': {
    subject: (props: { name: string }) => `新しいご相談 — ${props.name}様`,
    render: (props: {
      name: string
      company?: string | null
      email: string
      message?: string | null
      needsLabels: string[]
      projectSizeLabels: string[]
      submittedAt: string
    }) => ContactJpNotification(props),
  } as TemplateEntry<{
    name: string
    company?: string | null
    email: string
    message?: string | null
    needsLabels: string[]
    projectSizeLabels: string[]
    submittedAt: string
  }>,
} as const

// ── Idempotency ─────────────────────────────────────────────────────────

/**
 * Build the idempotency key. Same (userId, templateId, contextHash)
 * always produces the same key. `contextHash` is a hash of the props
 * so a *re-send with different props* (e.g. a new verification link)
 * gets a different key and goes through.
 */
export function buildIdempotencyKey(
  userId: string,
  templateId: TemplateId,
  props: unknown
): string {
  const contextHash = createHash('sha256')
    .update(JSON.stringify(props ?? {}))
    .digest('hex')
    .slice(0, 16)
  return `${userId}:${templateId}:${contextHash}`
}

// ── Resend client ──────────────────────────────────────────────────────

let cachedClient: Resend | null = null

function getResendClient(): Resend {
  if (cachedClient) return cachedClient
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  cachedClient = new Resend(key)
  return cachedClient
}

/** Test seam — reset the cached client. */
export function _resetResendClient(): void {
  cachedClient = null
}

// ── Public API ──────────────────────────────────────────────────────────

export interface SendTemplateInput<T extends TemplateId = TemplateId> {
  userId: string
  to: string
  templateId: T
  props: Parameters<(typeof TEMPLATES)[T]['render']>[0]
}

export type SendTemplateResult =
  | { sent: true; resendId: string; idempotencyKey: string }
  | { sent: false; skipped: true; idempotencyKey: string }

/**
 * Send a transactional email. Idempotent on (userId, templateId, props).
 */
export async function sendTemplate(
  input: SendTemplateInput
): Promise<SendTemplateResult> {
  const { userId, to, templateId, props } = input
  const entry = TEMPLATES[templateId]
  if (!entry) throw new Error(`Unknown template: ${templateId}`)

  const idempotencyKey = buildIdempotencyKey(userId, templateId, props)

  // Reserve the key — INSERT will fail if it already exists.
  const reserved = await reserveIdempotencyKey({
    email: to,
    idempotencyKey,
  })
  if (!reserved) {
    return { sent: false, skipped: true, idempotencyKey }
  }

  // Render + send.
  const subject = entry.subject(props as never)
  const react = entry.render(props as never)
  const from = process.env.RESEND_FROM ?? 'Ralph.world <hello@ralph.world>'
  // Optional reply-to — lets us send from a system address (send.ralph.world)
  // while replies land somewhere a human reads (e.g. hello@ralph.world).
  const replyTo = process.env.RESEND_REPLY_TO ?? 'subscriptions@ralph.world'

  const client = getResendClient()
  const result = await client.emails.send({ from, to, subject, react, replyTo })

  if (result.error) {
    // Resend rejected. Don't write the 'sent' row — caller can inspect
    // the email_events row to see the attempt landed but stalled.
    throw new Error(`Resend rejected send: ${result.error.message}`)
  }
  const resendId = result.data?.id ?? ''

  // Record the successful send (alongside the 'send_attempted' row).
  // This second row has no idempotency_key — partial index makes that fine.
  try {
    await getDb().insert(emailEvents).values({
      email: to,
      eventType: 'sent',
      resendEventId: resendId,
      payload: { templateId, subject } as unknown as object,
    })
  } catch (err) {
    // Send went through; we just lost the bookkeeping row. Log + move on.
    console.error('[email] failed to record sent row:', err)
  }

  return { sent: true, resendId, idempotencyKey }
}

/**
 * INSERT a 'send_attempted' row with the idempotency key. If the key
 * conflicts with an existing row, returns false (duplicate — skip send).
 * Otherwise returns true (this caller owns the send).
 */
async function reserveIdempotencyKey(args: {
  email: string
  idempotencyKey: string
}): Promise<boolean> {
  const db = getDb()
  try {
    await db.insert(emailEvents).values({
      email: args.email,
      eventType: 'send_attempted',
      idempotencyKey: args.idempotencyKey,
      payload: null,
    })
    return true
  } catch (err) {
    // Postgres unique-violation code is '23505'. Drizzle bubbles the
    // underlying error, so we duck-type. Any other error rethrows.
    const code = (err as { code?: string })?.code
    if (code === '23505') return false
    throw err
  }
}
