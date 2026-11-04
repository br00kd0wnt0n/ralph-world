import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

/**
 * Which print issue the new subscriber gets first, so nobody who joins
 * between issues is left wondering when their copy will come. Built by
 * lib/magazine/first-issue-server.ts in the Stripe invoice.paid handler.
 */
export interface ReceiptFirstIssue {
  issueNumber: number
  /** Completes "We expect to post it …", e.g. "in late January". */
  eta: string | null
  /** Most recent issue already sent, e.g. 9 / "22 October". */
  previousIssueNumber: number | null
  previousSentOn: string | null
  /** Has had copies before (resubscribing): say "next", not "first". */
  returning: boolean
}

interface Props {
  recipientName?: string | null
  /** Formatted period end date, e.g. "5 July 2026" */
  periodEnd: string
  /** Amount paid, e.g. "£3.00" */
  amount: string
  /** URL for Stripe Customer Portal */
  manageUrl: string
  firstIssue?: ReceiptFirstIssue | null
}

export function SubscriptionReceipt({ recipientName, periodEnd, amount, manageUrl, firstIssue }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <EmailLayout preview="You're now a paid Ralph subscriber — thanks!">
      <Text style={styles.h1}>You&apos;re subscribed 🎉</Text>
      <hr style={styles.divider} />
      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        Your Ralph subscription is now active. {amount}/month — next billing
        date <strong>{periodEnd}</strong>.
      </Text>
      {firstIssue && <FirstIssueSection {...firstIssue} />}
      <Text style={styles.paragraph}>
        You now have full access to the quarterly print magazine, premium
        digital content, TV, events, shop, and the lab.
      </Text>
      <Section style={styles.buttonWrap}>
        <Link href={manageUrl} style={styles.button}>
          Manage subscription
        </Link>
      </Section>
      <Text style={styles.detail}>
        Questions? Reply to this email or reach us at{' '}
        <Link href="mailto:hello@ralph.world" style={styles.link}>
          hello@ralph.world
        </Link>
        .
      </Text>
    </EmailLayout>
  )
}

function FirstIssueSection({
  issueNumber,
  eta,
  previousIssueNumber,
  previousSentOn,
  returning,
}: ReceiptFirstIssue) {
  const which = returning ? 'next' : 'first'
  return (
    <>
      <Text style={{ ...styles.paragraph, fontWeight: 700, margin: '20px 0 6px' }}>
        Your {which} copy
      </Text>
      <Text style={styles.paragraph}>
        Your {which} magazine will be <strong>Issue {issueNumber}</strong>.{' '}
        {eta
          ? `We expect to post it ${eta}, and you'll get a shipping email with tracking when it's on its way.`
          : "We'll post it as soon as it's printed, and you'll get a shipping email with tracking when it's on its way."}
      </Text>
      {previousIssueNumber !== null && previousSentOn && !returning && (
        <Text style={styles.detail}>
          Issue {previousIssueNumber} went out to subscribers on {previousSentOn},
          before you joined, so Issue {issueNumber} is the first one that&apos;s yours.
        </Text>
      )}
    </>
  )
}
