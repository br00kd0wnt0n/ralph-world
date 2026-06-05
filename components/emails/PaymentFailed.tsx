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
  /** URL to Stripe Customer Portal to update payment method */
  updatePaymentUrl: string
}

export function PaymentFailed({ recipientName, updatePaymentUrl }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <Html>
      <Head />
      <Preview>Action needed: your Ralph payment didn't go through</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            Payment failed
          </Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            We couldn&apos;t take your latest Ralph subscription payment. This can happen if your
            card has expired, has insufficient funds, or your bank blocked the charge.
          </Text>
          <Text style={text}>
            Stripe will retry automatically over the next few days. To avoid losing access, please
            update your payment method now.
          </Text>
          <Section style={section}>
            <Link href={updatePaymentUrl} style={button}>
              Update payment method
            </Link>
          </Section>
          <Text style={footer}>
            Need help?{' '}
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
