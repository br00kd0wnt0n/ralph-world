import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

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
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <Html>
      <Head />
      <Preview>Your Ralph magazine is on its way!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            Your magazine is on its way 📬
          </Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            <strong>{issueTitle}</strong> has been dispatched and is heading to you now.
          </Text>
          {shippingAddress ? (
            <Text style={detailText}>Shipping to:{'\n'}{shippingAddress}</Text>
          ) : null}
          {trackingUrl ? (
            <Section style={section}>
              <Link href={trackingUrl} style={button}>
                Track your parcel
              </Link>
            </Section>
          ) : null}
          <Text style={footer}>
            Wrong address or missing after 10 days?{' '}
            <Link href="mailto:hello@ralph.world" style={link}>
              hello@ralph.world
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { fontFamily: 'sans-serif', backgroundColor: '#fff', margin: 0 }
const container = { padding: '32px', maxWidth: '520px' }
const h1 = { fontSize: '24px', margin: '0 0 16px' }
const text = { fontSize: '16px', lineHeight: 1.5 }
const detailText = { fontSize: '14px', color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' as const }
const section = { margin: '24px 0' }
const button = {
  display: 'inline-block',
  padding: '12px 20px',
  backgroundColor: '#FF2098',
  color: '#fff',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 600,
}
const footer = { fontSize: '13px', color: '#888', marginTop: '24px', lineHeight: 1.5 }
const link = { color: '#FF2098' }
