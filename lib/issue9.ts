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

// Mon 19 Oct 2026, 00:00 UK time (still BST, so 23:00 UTC the day before).
// Until then the buy button stays closed even if the product is published in
// Shopify, so it can be published early for the image + a test order.
export const ISSUE9_OPENS_AT = new Date('2026-10-18T23:00:00Z')

export function isIssue9Open(now: Date = new Date()): boolean {
  return getIssue9Mode(now) === 'order' || now.getTime() >= ISSUE9_OPENS_AT.getTime()
}

// Server-only. Lets a test order through before opening: the buy request
// carries ?test=<ISSUE9_TEST_TOKEN> from the page URL. Unset = no bypass.
export function isIssue9TestToken(token: unknown): boolean {
  const expected = process.env.ISSUE9_TEST_TOKEN
  return Boolean(expected) && typeof token === 'string' && token === expected
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
  /** Button label before ISSUE9_OPENS_AT. */
  notOpenYet: string
  note: string
  unavailable: string
}

// Pre-order heading/body supplied 2026-10-13. Order-version body, button and
// note agreed on the 2026-10-15 call (second line dropped, "Pay today",
// "Available now").
export const ISSUE9_BUY_COPY: Record<Issue9Mode, Issue9BuyCopy> = {
  preorder: {
    eyebrow: 'Pre-order',
    heading: 'Ralph Issue 09',
    body: "50 years of Aardman, plus hats, ice hockey and collective nouns.\nPre-order now and it'll land on your doormat first.",
    cta: 'Pre-order for £{price}',
    notOpenYet: 'Pre-orders open Monday 19 October',
    note: 'Ships from Monday 26 October. You pay today.',
    unavailable: 'Pre-orders open soon',
  },
  order: {
    eyebrow: 'Out now',
    heading: 'Ralph Issue 09',
    body: '50 years of Aardman, plus hats, ice hockey and collective nouns.',
    cta: 'Pay today, £{price}',
    notOpenYet: 'Pre-orders open Monday 19 October',
    note: 'Available now',
    unavailable: 'Sold out',
  },
}

export const ISSUE9_JOIN_COPY = {
  // Supplied 2026-10-13.
  heading: 'Fun worth finding',
  // Newsletter mention dropped 2026-10-16 (Dave) while there's no list to join.
  body: 'Subscribe to Ralph World, free, for first dibs on event tickets and a heads-up on new issues before they land.',
  signedInHeading: "You're in",
  signedInBody: 'Welcome to Ralph World. Have a look around.',
}

// Shown under the buy button to paid subscribers (tier 'paid'), whose copy is
// sent through the CMS fulfilment run. PLACEHOLDER wording.
export const ISSUE9_SUBSCRIBER_NOTE =
  "You're a subscriber, so Issue 09 is already coming to you. This would be an extra copy."
