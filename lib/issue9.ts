/**
 * Issue 9 campaign landing page (/issue9) — config + placeholder copy.
 *
 * One URL, two states: `preorder` until launch, `order` from launch. The
 * switch is date-driven so nobody has to deploy on launch morning;
 * ISSUE9_MODE ('preorder' | 'order') forces either state if plans move.
 */

export type Issue9Mode = 'preorder' | 'order'

// Mon 26 Oct 2026, 00:00 UK time. UK clocks go back on Sun 25 Oct, so
// midnight London is midnight UTC.
export const ISSUE9_LAUNCH_AT = new Date('2026-10-26T00:00:00Z')

export function getIssue9Mode(now: Date = new Date()): Issue9Mode {
  const override = process.env.ISSUE9_MODE
  if (override === 'preorder' || override === 'order') return override
  return now.getTime() >= ISSUE9_LAUNCH_AT.getTime() ? 'order' : 'preorder'
}

// Handle of the existing Issue 9 product in Shopify (admin id 11185704730967,
// shop.ralph.world/products/ralph-mag-9). ISSUE9_PRODUCT_HANDLE overrides.
export function getIssue9ProductHandle(): string {
  return process.env.ISSUE9_PRODUCT_HANDLE || 'ralph-mag-9'
}

interface Issue9BuyCopy {
  eyebrow: string
  heading: string
  body: string
  /** `{price}` is replaced with the formatted Shopify price. */
  cta: string
  note: string
  unavailable: string
}

// Pre-order heading/body supplied 2026-10-13. The `order` body reuses the
// first line + "Out now." until its own wording arrives; notes are ours.
export const ISSUE9_BUY_COPY: Record<Issue9Mode, Issue9BuyCopy> = {
  preorder: {
    eyebrow: 'Pre-order',
    heading: 'Ralph Issue 09',
    body: "50 years of Aardman, plus hats, ice hockey and collective nouns.\nPre-order now and it'll land on your doormat first.",
    cta: 'Pre-order for £{price}',
    note: 'Ships from Monday 26 October. You pay today.',
    unavailable: 'Pre-orders open soon',
  },
  order: {
    eyebrow: 'Out now',
    heading: 'Ralph Issue 09',
    body: '50 years of Aardman, plus hats, ice hockey and collective nouns.\nOut now.',
    cta: 'Buy now for £{price}',
    note: 'Shipping now.',
    unavailable: 'Sold out',
  },
}

export const ISSUE9_JOIN_COPY = {
  // Supplied 2026-10-13.
  heading: 'Fun worth finding',
  body: 'Subscribe to Ralph World, free, for our weekly newsletter, first dibs on event tickets and a heads-up on new issues before they land.',
  // PLACEHOLDER wording for the marketing opt-in tick box (unticked by default).
  optIn: 'Email me Ralph news, new issues and events. Unsubscribe any time.',
  signedInHeading: "You're in",
  signedInBody: 'Welcome to Ralph World. Have a look around.',
}

// Shown under the buy button to paid subscribers (tier 'paid'), whose copy is
// sent through the CMS fulfilment run. PLACEHOLDER wording.
export const ISSUE9_SUBSCRIBER_NOTE =
  "You're a subscriber, so Issue 09 is already coming to you. This would be an extra copy."
