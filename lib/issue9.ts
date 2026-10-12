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

// Handle of the existing Issue 9 product in Shopify. PLACEHOLDER default —
// set ISSUE9_PRODUCT_HANDLE in Railway once Vicky confirms the product.
export function getIssue9ProductHandle(): string {
  return process.env.ISSUE9_PRODUCT_HANDLE || 'ralph-magazine-issue-9'
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

// PLACEHOLDER copy throughout — final wording to come from Dave.
export const ISSUE9_BUY_COPY: Record<Issue9Mode, Issue9BuyCopy> = {
  preorder: {
    eyebrow: 'Pre-order',
    heading: 'Ralph Issue 09',
    body: 'The new issue of Ralph is nearly here. Pre-order now and it lands on your doormat first.',
    cta: 'Pre-order for £{price}',
    note: 'Ships from Monday 26 October. You pay today.',
    unavailable: 'Pre-orders open soon',
  },
  order: {
    eyebrow: 'Out now',
    heading: 'Ralph Issue 09',
    body: 'The new issue of Ralph is out now.',
    cta: 'Buy now for £{price}',
    note: 'Shipping now.',
    unavailable: 'Sold out',
  },
}

export const ISSUE9_JOIN_COPY = {
  heading: 'Join Ralph World',
  // PLACEHOLDER — the "what you get for joining" promise is an open question.
  // Borrowed from the Digital Ralph tier copy on /join-ralph for now.
  body: "It's free. Enjoy access to all our editorial content, buy tickets to one of our amazing IRL events and much more.",
  signedInHeading: "You're in",
  signedInBody: 'Welcome to Ralph World. Have a look around.',
}
