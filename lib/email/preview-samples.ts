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
    accessUntil: 'Tuesday, 22 July 2026',
    resubscribeUrl: 'https://ralph.world/subscribe',
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
}
