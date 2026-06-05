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
  /** Formatted access-until date, e.g. "5 July 2026" */
  accessUntil: string
  /** URL to re-subscribe */
  resubscribeUrl: string
}

export function SubscriptionCancelled({ recipientName, accessUntil, resubscribeUrl }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <Html>
      <Head />
      <Preview>Your Ralph subscription has been cancelled</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            Subscription cancelled
          </Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Your Ralph subscription has been cancelled. You&apos;ll keep full access until{' '}
            <strong>{accessUntil}</strong>, after which your account moves to the free tier.
          </Text>
          <Text style={text}>
            Changed your mind? You can re-subscribe any time.
          </Text>
          <Section style={section}>
            <Link href={resubscribeUrl} style={button}>
              Re-subscribe
            </Link>
          </Section>
          <Text style={footer}>
            Feedback on why you cancelled?{' '}
            <Link href="mailto:hello@ralph.world" style={link}>
              We&apos;d love to hear it.
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
