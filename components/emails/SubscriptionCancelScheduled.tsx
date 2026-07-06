import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  recipientName?: string | null
  /** Formatted access-until date, e.g. "5 July 2026" */
  accessUntil: string
  /** URL back to /account for the "changed my mind" flow */
  reactivateUrl: string
}

/**
 * Sent immediately when a user schedules a cancellation from the member
 * portal (customer.subscription.updated where cancel_at_period_end just
 * flipped false → true). Acknowledges the action, restates the date
 * access ends, and gives a one-click reactivation route.
 */
export function SubscriptionCancelScheduled({
  recipientName,
  accessUntil,
  reactivateUrl,
}: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
  return (
    <EmailLayout preview="Cancellation scheduled — you still have access until your period ends">
      <Text style={eyebrow}>Cancellation scheduled</Text>
      <Text style={styles.h1}>We&apos;ll be sorry to see you go</Text>

      <hr style={styles.divider} />

      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        You&apos;ve scheduled your Ralph subscription to cancel. You&apos;ll
        keep full access until <strong>{accessUntil}</strong>, after which
        your account will move to the free tier.
      </Text>
      <Text style={styles.paragraph}>
        Nothing more you need to do — no final charges, no surprise emails.
        We&apos;ll send one more note the day your access ends.
      </Text>

      <Section style={styles.buttonWrap}>
        <Link href={reactivateUrl} style={styles.button}>
          Reactivate subscription
        </Link>
      </Section>

      <Text style={styles.detail}>
        Changed your mind? You can reactivate any time before{' '}
        {accessUntil} from your{' '}
        <Link href={reactivateUrl} style={styles.link}>
          account page
        </Link>
        .
      </Text>

      <Text style={styles.detail}>
        We&apos;d love to know what made you cancel. Reply to this email or
        drop a line to{' '}
        <Link href="mailto:hello@ralph.world" style={styles.link}>
          hello@ralph.world
        </Link>{' '}
        — even one line helps.
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
