/**
 * Sample props for each transactional template — single source of truth
 * reused by the local React Email dev server (`npm run email:dev`) and
 * by the admin email-test endpoint. Editing values here updates both.
 *
 * Prop shapes must mirror the TEMPLATES registry in lib/email/send.ts.
 */

import type { TemplateId } from './send'

type SampleProps = Record<TemplateId, Record<string, unknown>>

export const PREVIEW_SAMPLES: SampleProps = {
  'email-verification': {
    recipientName: 'Joshua King',
    verificationUrl: 'https://ralph.world/verify?token=preview-token',
  },
  'subscription-receipt': {
    recipientName: 'Joshua King',
    amount: '£3.00',
    periodEnd: 'Tuesday, 22 July 2026',
    manageUrl: 'https://ralph.world/account/billing',
  },
  'payment-failed': {
    recipientName: 'Joshua King',
    updatePaymentUrl: 'https://ralph.world/account/billing',
  },
  'subscription-cancelled': {
    recipientName: 'Joshua King',
    endedOn: '5 July 2026',
    resubscribeUrl: 'https://ralph.world/subscribe',
  },
  'subscription-cancel-scheduled': {
    recipientName: 'Joshua King',
    accessUntil: '5 August 2026',
    reactivateUrl: 'https://ralph.world/account',
  },
  'event-rsvp': {
    recipientName: 'Joshua King',
    eventTitle: 'Ralph Live at the Roundhouse',
    eventDate: 'Saturday 4 October 2026 · 7:30 PM',
    eventLocation: 'The Roundhouse, Camden, London',
    eventUrl: 'https://ralph.world/events/ralph-live-roundhouse',
  },
  'magazine-shipped': {
    recipientName: 'Joshua King',
    issueTitle: 'Ralph Mag #9 — Summer 2026',
    trackingUrl: 'https://royalmail.com/track/AB123456789GB',
    shippingAddress: '68 Alric Avenue\nNew Malden\nKT3 4JW\nUnited Kingdom',
  },
  'password-reset': {
    recipientName: 'Joshua King',
    resetUrl: 'https://ralph.world/reset-password?token=preview-token',
  },
  'contact-jp-notification': {
    name: '田中 太郎',
    company: '株式会社サンプル',
    email: 'tanaka@example.co.jp',
    message:
      '新しいキャンペーンの企画段階で、クリエイティブパートナーを探しています。一度カジュアルに話せると嬉しいです。',
    needsLabels: ['ブランディング・クリエイティブ戦略', 'キャンペーン・プロモーション企画'],
    projectSizeLabels: ['中規模プロジェクト（100〜500万円）'],
    submittedAt: '2026年6月19日 14:32 (JST)',
  },
}
