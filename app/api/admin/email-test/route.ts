import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'
import { sendTemplate, type TemplateId } from '@/lib/email/send'
import { PREVIEW_SAMPLES } from '@/lib/email/preview-samples'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Email test send — admin tool for reviewing transactional templates in
 * a real inbox without triggering the upstream system (fulfilment,
 * signup, RSVP, etc.).
 *
 * Sends a template-rendered email to an arbitrary recipient using
 * sample props (overridable per request). Bypasses the
 * email_events/idempotency layer by passing a unique userId per call,
 * so you can re-send the same template to the same address freely.
 *
 * Auth: shared bearer token (INTERNAL_API_TOKEN) — same gate as the
 * other admin endpoints.
 *
 * Body: { templateId, to, props? }
 *   - templateId : one of the TemplateId union (see lib/email/send.ts).
 *   - to         : recipient email address.
 *   - props      : optional override of the sample props (shallow merge
 *                  over PREVIEW_SAMPLES[templateId]). Use this to test
 *                  edge cases — empty trackingUrl, long names, etc.
 *
 * Response: { ok, templateId, to, sentAt }
 *
 * Example:
 *   curl -X POST $APP_URL/api/admin/email-test \\
 *     -H "Authorization: Bearer $INTERNAL_API_TOKEN" \\
 *     -H "Content-Type: application/json" \\
 *     -d '{"templateId":"magazine-shipped","to":"you@example.com"}'
 */

const KNOWN_TEMPLATES: readonly TemplateId[] = [
  'email-verification',
  'subscription-receipt',
  'subscription-cancelled',
  'subscription-cancel-scheduled',
  'payment-failed',
  'event-rsvp',
  'magazine-shipped',
  'password-reset',
  'contact-jp-notification',
]

function authorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_TOKEN
  if (!expected) {
    console.error('[email-test] INTERNAL_API_TOKEN is not set')
    return false
  }
  const header = req.headers.get('authorization') ?? ''
  if (header.length !== `Bearer ${expected}`.length) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(header),
      Buffer.from(`Bearer ${expected}`)
    )
  } catch {
    return false
  }
}

function isValidEmail(s: string): boolean {
  // Minimal sanity check — Resend will reject invalid addresses itself.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { templateId?: unknown; to?: unknown; props?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const templateId = typeof body.templateId === 'string' ? (body.templateId as TemplateId) : null
  const to = typeof body.to === 'string' ? body.to.trim() : ''
  const propsOverride =
    body.props && typeof body.props === 'object' && !Array.isArray(body.props)
      ? (body.props as Record<string, unknown>)
      : {}

  if (!templateId || !KNOWN_TEMPLATES.includes(templateId)) {
    return NextResponse.json(
      {
        error: 'templateId is required',
        validTemplates: KNOWN_TEMPLATES,
      },
      { status: 400 }
    )
  }

  if (!to || !isValidEmail(to)) {
    return NextResponse.json(
      { error: 'to is required and must be a valid email address' },
      { status: 400 }
    )
  }

  // Shallow-merge override on top of the canonical sample. Anything not
  // overridden keeps the dev-server preview values, so a curl with
  // `{templateId, to}` and no `props` is the easiest possible test.
  const sample = PREVIEW_SAMPLES[templateId]
  const props = { ...sample, ...propsOverride }

  // Use a unique synthetic userId per call so the idempotency layer in
  // sendTemplate never short-circuits repeated test sends. Prefix
  // distinguishes test traffic in the email_events log.
  const fakeUserId = `test-${crypto.randomUUID()}`

  try {
    await sendTemplate({
      userId: fakeUserId,
      to,
      templateId,
      // sendTemplate's input type is strongly typed via TemplateId; cast
      // here since props is a merged Record at the boundary.
      props: props as never,
    })
  } catch (err) {
    console.error('[email-test] send failed', err)
    return NextResponse.json(
      {
        error: 'Send failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    templateId,
    to,
    propsUsed: props,
    sentAt: new Date().toISOString(),
  })
}

/**
 * GET — list valid templates and the sample props each would render
 * with. No auth surface beyond the bearer token; safe to use as a
 * sanity check before POSTing.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    templates: KNOWN_TEMPLATES,
    samples: PREVIEW_SAMPLES,
    usage:
      'POST { templateId, to, props? } — props are merged over PREVIEW_SAMPLES[templateId].',
  })
}
