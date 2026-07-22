import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  verificationUrl: string
  recipientName?: string | null
}

/**
 * Email verification template. Sent by Auth.js Credentials provider on
 * signup and on email change.
 */
export function EmailVerification({ verificationUrl, recipientName }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <EmailLayout preview="Confirm your Ralph.world email address">
      <Text style={styles.h1}>Verify your email</Text>
      <hr style={styles.divider} />
      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        Tap the link below to confirm this email belongs to you and finish
        setting up your Ralph.world account.
      </Text>
      <Section style={styles.buttonWrap}>
        <Link href={verificationUrl} style={styles.button}>
          Verify email
        </Link>
      </Section>
      <Text style={styles.detail}>
        If the button doesn&apos;t work, paste this link into your browser:
      </Text>
      <Text style={{ ...styles.detail, wordBreak: 'break-all' }}>
        {verificationUrl}
      </Text>
      <Text style={styles.detail}>
        Didn&apos;t sign up? You can ignore this email.
      </Text>
    </EmailLayout>
  )
}
