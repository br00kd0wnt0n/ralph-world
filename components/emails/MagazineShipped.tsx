import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  recipientName?: string | null
  /** Issue title/number, e.g. "Issue 12 — Summer 2026" */
  issueTitle: string
  /** Optional carrier tracking URL */
  trackingUrl?: string | null
  /** Formatted shipping address (plain text, line breaks ok) */
  shippingAddress?: string | null
}

export function MagazineShipped({
  recipientName,
  issueTitle,
  trackingUrl,
  shippingAddress,
}: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
  return (
    <EmailLayout preview="Your Ralph magazine is on its way!">
      <Text style={eyebrow}>Magazine dispatched</Text>
      <Text style={styles.h1}>Your magazine is on its way 📬</Text>

      <hr style={styles.divider} />

      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        <strong style={strong}>{issueTitle}</strong> has been dispatched
        from the print works and is heading to your letterbox now. Give it
        a few working days — UK posties willing.
      </Text>

      {shippingAddress ? (
        <Section style={addressCard}>
          <Text style={addressLabel}>Shipping to</Text>
          <Text style={addressBody}>{shippingAddress}</Text>
        </Section>
      ) : null}

      {trackingUrl ? (
        <Section style={styles.buttonWrap}>
          <Link href={trackingUrl} style={styles.button}>
            Track your parcel →
          </Link>
        </Section>
      ) : null}

      <Text style={styles.detail}>
        Wrong address, or nothing in the post after 10 days? Reply to this
        email or drop a line to{' '}
        <Link href="mailto:hello@ralph.world" style={styles.link}>
          hello@ralph.world
        </Link>{' '}
        and we&apos;ll sort it.
      </Text>

      <Text style={styles.paragraph}>
        Enjoy the read. We hope it makes your sofa a slightly more
        interesting place to be.
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

const strong = {
  fontWeight: 700,
  color: '#0B0B0B',
}

const addressCard = {
  backgroundColor: '#F5F2EC',
  border: '1px solid #E4DED1',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '8px 0 18px',
}

const addressLabel = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: '#6B5B8A',
  margin: '0 0 6px',
}

const addressBody = {
  fontSize: '14px',
  lineHeight: 1.5,
  color: '#0B0B0B',
  margin: 0,
  whiteSpace: 'pre-line' as const,
}
