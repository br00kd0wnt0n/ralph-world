import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  recipientName?: string | null
  /** Formatted period end date, e.g. "5 July 2026" */
  periodEnd: string
  /** Amount paid, e.g. "£3.00" */
  amount: string
  /** URL for Stripe Customer Portal */
  manageUrl: string
}

export function SubscriptionReceipt({ recipientName, periodEnd, amount, manageUrl }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <EmailLayout preview="You're now a paid Ralph subscriber — thanks!">
      <Text style={styles.h1}>You&apos;re subscribed 🎉</Text>
      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        Your Ralph subscription is now active. {amount}/month — next billing
        date <strong>{periodEnd}</strong>.
      </Text>
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
