/**
 * Which print issue a new paid subscriber will get first.
 *
 * Rule (from how "Fulfil Issue N" works in the CMS): the fulfilment run
 * ships an issue to every paid subscriber who doesn't already have a
 * shipment for it, so someone who joins after an issue's run gets the next
 * issue that hasn't been run yet.
 *
 *   - last fulfilled = the highest-numbered issue with a fulfilment run (or
 *     shipments, for older runs);
 *   - first issue    = the lowest-numbered issue above that which hasn't
 *     been run; if the CMS has no row for it yet, last fulfilled + 1.
 *
 * Rough timing isn't derivable from the data (issue dates only drive sort
 * order), so it comes from the CMS Site Copy field
 * `magazine_next_issue_eta`, e.g. "in late January". Blank = unknown.
 *
 * Pure part here (unit-tested); DB loader in ./first-issue-server.ts.
 */

export interface IssueFulfilment {
  issueNumber: number
  title: string | null
  /** When its fulfilment run started; null = never run. */
  fulfilledAt: Date | null
}

export interface FirstIssue {
  issueNumber: number
  /** Completes "We expect to post it …"; null when not set in the CMS. */
  eta: string | null
  /** The issue that most recently went out, for context in the email. */
  previous: { issueNumber: number; fulfilledAt: Date } | null
}

export function pickFirstIssue(
  issues: readonly IssueFulfilment[],
  eta: string | null
): FirstIssue | null {
  const fulfilled = issues
    .filter((i): i is IssueFulfilment & { fulfilledAt: Date } => i.fulfilledAt !== null)
    .sort((a, b) => b.issueNumber - a.issueNumber)
  const last = fulfilled[0] ?? null
  const previous = last ? { issueNumber: last.issueNumber, fulfilledAt: last.fulfilledAt } : null
  const cleanEta = eta?.trim() ? eta.trim() : null

  const upcoming = issues
    .filter((i) => i.fulfilledAt === null && (!last || i.issueNumber > last.issueNumber))
    .sort((a, b) => a.issueNumber - b.issueNumber)[0]

  if (upcoming) return { issueNumber: upcoming.issueNumber, eta: cleanEta, previous }
  if (last) return { issueNumber: last.issueNumber + 1, eta: cleanEta, previous }
  return null
}
