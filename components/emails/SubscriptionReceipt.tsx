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
    <Html>
      <Head />
      <Preview>You're now a paid Ralph subscriber — thanks!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            You&apos;re subscribed 🎉
          </Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Your Ralph subscription is now active. {amount}/month — next billing date{' '}
            <strong>{periodEnd}</strong>.
          </Text>
          <Text style={text}>
            You now have full access to the quarterly print magazine, premium digital content, TV,
            events, shop, and the lab.
          </Text>
          <Section style={section}>
            <Link href={manageUrl} style={button}>
              Manage subscription
            </Link>
          </Section>
          <Text style={footer}>
            Questions? Reply to this email or reach us at{' '}
            <Link href="mailto:hello@ralph.world" style={link}>
              hello@ralph.world
            </Link>
            .
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
