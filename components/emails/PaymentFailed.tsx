import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  recipientName?: string | null
  /** URL to Stripe Customer Portal to update payment method */
  updatePaymentUrl: string
}

export function PaymentFailed({ recipientName, updatePaymentUrl }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <EmailLayout preview="Action needed: your Ralph payment didn't go through">
      <Text style={styles.h1}>Payment failed</Text>
      <hr style={styles.divider} />
      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        We couldn&apos;t take your latest Ralph subscription payment. This can
        happen if your card has expired, has insufficient funds, or your bank
        blocked the charge.
      </Text>
      <Text style={styles.paragraph}>
        Stripe will retry automatically over the next few days. To avoid losing
        access, please update your payment method now.
      </Text>
      <Section style={styles.buttonWrap}>
        <Link href={updatePaymentUrl} style={styles.button}>
          Update payment method
        </Link>
      </Section>
      <Text style={styles.detail}>
        Need help?{' '}
        <Link href="mailto:hello@ralph.world" style={styles.link}>
          hello@ralph.world
        </Link>
      </Text>
    </EmailLayout>
  )
}
