import { NextResponse, type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { contactSubmissions } from '@/lib/db/schema'
import { sendTemplate } from '@/lib/email/send'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/contact/jp — public contact form submission for /jp/contact.
 *
 * Flow:
 *   1. Honeypot check — bots fill `hp_field`; reject silently with 200.
 *   2. Per-IP rate limit (1 submit / 60s, in-memory).
 *   3. Validate payload.
 *   4. Insert row into contact_submissions.
 *   5. Fire-and-forget two Resend emails:
 *        - Notification → Yuki (with expanded JA labels).
 *        - Confirmation → submitter (echoes their selections).
 *      Email failures DON'T fail the request — the row is the source of
 *      truth; we'll stamp notified_at when the team email succeeds and an
 *      operator can chase failures from the DB log later.
 */

// Internal notification recipients. Yuki is the primary owner — we stamp
// notified_at after her send succeeds. Chris is cc'd via a second send so
// both addresses show up cleanly in their own inbox + the email_events
// log records one row per recipient (helpful for chasing delivery).
const TOKYO_NOTIFY_EMAILS = [
  'yuki.koizumi@ralphandco.com',
  'chris@ralph.world',
] as const

// Display-label maps. Keys here are the only ones accepted from the
// client; any unknown key is dropped. Editors can rewrite the display
// labels here without breaking historical rows (the keys stay stable
// in the DB).
const NEEDS_LABELS: Record<string, string> = {
  branding_strategy: 'ブランディング・クリエイティブ戦略',
  campaign_promotion: 'キャンペーン・プロモーション企画',
  content_production: 'コンテンツ制作（動画・静止画・コピー）',
  sns_management: 'SNS運用・ソーシャルコミュニケーション',
  influencer_casting: 'インフルエンサー・タレントキャスティング',
  not_sure: 'まだ決まっていない・まず話したい',
}
const PROJECT_SIZE_LABELS: Record<string, string> = {
  spot_under_1m: 'スポット・単発（〜100万円程度）',
  mid_1m_5m: '中規模プロジェクト（100〜500万円）',
  large_over_5m: '大型・継続案件（500万円〜）',
  undecided: '未定・まずは相談したい',
}

// In-memory rate limit — keyed by IP. Caveat: Railway can run multiple
// instances, so a determined bot could spread requests across them and
// bypass the 60s window. Acceptable for a low-traffic contact form;
// upgrade to a DB- or Redis-backed limit if we see real abuse.
const RATE_LIMIT_MS = 60_000
const lastSubmitByIp = new Map<string, number>()

function ipOf(req: NextRequest): string {
  // Railway proxies set x-forwarded-for; first value is the real client.
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

interface RequestBody {
  needs?: unknown
  projectSize?: unknown
  name?: unknown
  company?: unknown
  email?: unknown
  message?: unknown
  hp_field?: unknown
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 1. Honeypot — if a bot filled this hidden field, pretend success.
  if (typeof body.hp_field === 'string' && body.hp_field.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  // 2. Rate limit.
  const ip = ipOf(req)
  const now = Date.now()
  const last = lastSubmitByIp.get(ip)
  if (last && now - last < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: 'Too many requests — please try again in a moment.' },
      { status: 429 }
    )
  }

  // 3. Validate.
  const needs = Array.isArray(body.needs)
    ? (body.needs as unknown[]).filter(
        (k): k is string => typeof k === 'string' && k in NEEDS_LABELS
      )
    : []
  const projectSize = Array.isArray(body.projectSize)
    ? (body.projectSize as unknown[]).filter(
        (k): k is string => typeof k === 'string' && k in PROJECT_SIZE_LABELS
      )
    : []
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : ''
  const company =
    typeof body.company === 'string' ? body.company.trim().slice(0, 200) || null : null
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 320) : ''
  const message =
    typeof body.message === 'string' ? body.message.trim().slice(0, 4000) || null : null

  const errors: string[] = []
  if (needs.length === 0) errors.push('ご相談内容を1つ以上選択してください。')
  if (projectSize.length === 0)
    errors.push('プロジェクトの規模感を1つ以上選択してください。')
  if (!name) errors.push('お名前を入力してください。')
  if (!email || !isValidEmail(email))
    errors.push('有効なメールアドレスを入力してください。')

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' ') }, { status: 400 })
  }

  // 4. Persist.
  const db = getDb()
  const userAgent = req.headers.get('user-agent') ?? null
  let submissionId: string
  let submittedAt: Date
  try {
    const [row] = await db
      .insert(contactSubmissions)
      .values({
        locale: 'ja',
        needs,
        projectSize,
        name,
        company,
        email,
        message,
        ip,
        userAgent,
      })
      .returning({
        id: contactSubmissions.id,
        submittedAt: contactSubmissions.submittedAt,
      })
    submissionId = row.id
    submittedAt = row.submittedAt
  } catch (err) {
    console.error('[contact/jp] insert failed', err)
    return NextResponse.json(
      { error: '送信エラー — もう一度お試しください。' },
      { status: 500 }
    )
  }

  lastSubmitByIp.set(ip, now)

  // 5. Fire emails. The team notification is the important one — if it
  // succeeds we stamp notified_at so unprocessed submissions are easy to
  // find (notified_at IS NULL). The confirmation to the submitter is
  // best-effort.
  const needsLabels = needs.map((k) => NEEDS_LABELS[k])
  const projectSizeLabels = projectSize.map((k) => PROJECT_SIZE_LABELS[k])
  const submittedAtJa = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(submittedAt)

  // Fire one notification per recipient. The first send (Yuki) stamps
  // notified_at on success — subsequent recipients are best-effort and
  // their failures are logged but don't affect that flag.
  const notificationProps = {
    name,
    company,
    email,
    message,
    needsLabels,
    projectSizeLabels,
    submittedAt: `${submittedAtJa} (JST)`,
  }
  for (const [idx, recipient] of TOKYO_NOTIFY_EMAILS.entries()) {
    try {
      await sendTemplate({
        // Vary the userId per recipient so the idempotency layer in
        // sendTemplate doesn't dedupe the second send.
        userId: `contact-${submissionId}-${idx}`,
        to: recipient,
        templateId: 'contact-jp-notification',
        props: notificationProps,
      })
      if (idx === 0) {
        await db
          .update(contactSubmissions)
          .set({ notifiedAt: new Date() })
          .where(eq(contactSubmissions.id, submissionId))
      }
    } catch (err) {
      console.error('[contact/jp] notification email failed', {
        submissionId,
        recipient,
        err,
      })
    }
  }

  try {
    await sendTemplate({
      userId: `contact-${submissionId}`,
      to: email,
      templateId: 'contact-jp-confirmation',
      props: { name, needsLabels, projectSizeLabels },
    })
  } catch (err) {
    console.error('[contact/jp] confirmation email failed', { submissionId, err })
  }

  return NextResponse.json({ ok: true })
}
