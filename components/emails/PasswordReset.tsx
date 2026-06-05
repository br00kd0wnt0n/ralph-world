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
  resetUrl: string
  recipientName?: string | null
}

/**
 * Password reset email. Link expires after 1 hour.
 */
export function PasswordReset({ resetUrl, recipientName }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <Html>
      <Head />
      <Preview>Reset your Ralph.world password</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            Reset your password
          </Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            We received a request to reset your Ralph.world password. Click the button below —
            this link expires in <strong>1 hour</strong>.
          </Text>
          <Section style={section}>
            <Link href={resetUrl} style={button}>
              Reset password
            </Link>
          </Section>
          <Text style={smallText}>
            If the button doesn&apos;t work, paste this link into your browser:
          </Text>
          <Text style={urlText}>{resetUrl}</Text>
          <Text style={footer}>
            Didn&apos;t request a reset? You can safely ignore this email — your password
            hasn&apos;t changed.
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
const smallText = { fontSize: '14px', color: '#555', lineHeight: 1.5 }
const urlText = { fontSize: '13px', color: '#888', wordBreak: 'break-all' as const }
const footer = { fontSize: '13px', color: '#888', marginTop: '24px', lineHeight: 1.5 }
