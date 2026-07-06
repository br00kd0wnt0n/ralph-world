import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  recipientName?: string | null
  /** Formatted end date, e.g. "5 July 2026". This is the date the
   *  subscription actually ended — usually today. */
  endedOn: string
  /** URL to re-subscribe */
  resubscribeUrl: string
}

/**
 * Sent when the subscription actually ends (customer.subscription.deleted).
 * The user is now on the free tier. Distinct from
 * SubscriptionCancelScheduled which fires when they click cancel.
 */
export function SubscriptionCancelled({
  recipientName,
  endedOn,
  resubscribeUrl,
}: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
  return (
    <EmailLayout preview="Your Ralph subscription has ended">
      <Text style={eyebrow}>Subscription ended</Text>
      <Text style={styles.h1}>Your Ralph subscription has ended</Text>

      <hr style={styles.divider} />

      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        Your Ralph subscription ended on <strong>{endedOn}</strong>. Your
        account has moved to the free tier — you can still read the site
        and log in as normal, but paid articles and the printed magazine
        aren&apos;t part of that.
      </Text>
      <Text style={styles.paragraph}>
        Fancy coming back? Re-subscribe in a couple of clicks and
        you&apos;ll be on the next issue.
      </Text>

      <Section style={styles.buttonWrap}>
        <Link href={resubscribeUrl} style={styles.button}>
          Re-subscribe
        </Link>
      </Section>

      <Text style={styles.detail}>
        Feedback on why you left?{' '}
        <Link href="mailto:hello@ralph.world" style={styles.link}>
          We&apos;d genuinely love to hear it.
        </Link>
      </Text>
    </EmailLayout>
  )
}

const eyebrow = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  color: '#EA128B',
  margin: '0 0 12px',
}
