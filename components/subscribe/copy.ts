/**
 * Copy for the /subscribe landing page. Kept in one place so Josh/Vicky's
 * edits are a one-file change. What each tier includes must match
 * lib/entitlements.ts: TV is unlimited for every signed-in member (only
 * guests get the 10-minute preview), so TV belongs to the free tier.
 */

/** guest = signed out; member = signed in, not paying; paid = subscriber. */
export type MemberState = 'guest' | 'member' | 'paid'

export const SUBSCRIBE_COPY = {
  heading: 'Join Ralph',
  intro: {
    guest:
      'Pop culture for the fun of it. Join for free to read the magazine and watch Ralph TV, or get Ralph in print through your letterbox every quarter.',
    member:
      'You’re already in. Add the print magazine through your letterbox every quarter for £3 a month.',
    paid: 'You’re a Physical Ralph subscriber. Thanks for backing us.',
  } satisfies Record<MemberState, string>,
  free: {
    name: 'Digital Ralph',
    price: 'Free',
    includes: [
      'Read Ralph Magazine online',
      'Unlimited Ralph TV (without an account it stops after 10 minutes)',
      'Tickets to our IRL events',
    ],
    cta: 'Join for free',
  },
  paid: {
    name: 'Physical Ralph',
    price: '£3 a month',
    includes: [
      'Everything in Digital Ralph',
      'Ralph Magazine in print, four times a year, posted to your door',
      'Subscriber-only articles',
      'Cancel any time from your account',
    ],
    cta: 'Join for £3 a month',
    upgradeCta: 'Upgrade for £3 a month',
    smallprint: 'Billed monthly at £3. Includes VAT and postage. UK addresses only.',
  },
} as const
