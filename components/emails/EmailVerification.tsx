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
  verificationUrl: string
  recipientName?: string | null
}

/**
 * Email verification template. Sent by Auth.js Credentials provider on
 * signup and on email change. Minimal styling — Ralph brand polish in a
 * later pass.
 */
export function EmailVerification({ verificationUrl, recipientName }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <Html>
      <Head />
      <Preview>Confirm your Ralph.world email address</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#fff', margin: 0 }}>
        <Container style={{ padding: '32px', maxWidth: '520px' }}>
          <Heading as="h1" style={{ fontSize: '24px', margin: '0 0 16px' }}>
            Verify your email
          </Heading>
          <Text style={{ fontSize: '16px', lineHeight: 1.5 }}>{greeting}</Text>
          <Text style={{ fontSize: '16px', lineHeight: 1.5 }}>
            Tap the link below to confirm this email belongs to you and finish setting up your
            Ralph.world account.
          </Text>
          <Section style={{ margin: '24px 0' }}>
            <Link
              href={verificationUrl}
              style={{
                display: 'inline-block',
                padding: '12px 20px',
                backgroundColor: '#FF2098',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Verify email
            </Link>
          </Section>
          <Text style={{ fontSize: '14px', color: '#555', lineHeight: 1.5 }}>
            If the button doesn&apos;t work, paste this link into your browser:
          </Text>
          <Text style={{ fontSize: '13px', color: '#888', wordBreak: 'break-all' }}>
            {verificationUrl}
          </Text>
          <Text style={{ fontSize: '13px', color: '#888', marginTop: '24px' }}>
            Didn&apos;t sign up? You can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
