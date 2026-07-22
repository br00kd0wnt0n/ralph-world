import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

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
    <EmailLayout preview="Reset your Ralph.world password">
      <Text style={styles.h1}>Reset your password</Text>
      <hr style={styles.divider} />
      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        We received a request to reset your Ralph.world password. Click the
        button below — this link expires in <strong>1 hour</strong>.
      </Text>
      <Section style={styles.buttonWrap}>
        <Link href={resetUrl} style={styles.button}>
          Reset password
        </Link>
      </Section>
      <Text style={styles.detail}>
        If the button doesn&apos;t work, paste this link into your browser:
      </Text>
      <Text style={{ ...styles.detail, wordBreak: 'break-all' }}>{resetUrl}</Text>
      <Text style={styles.detail}>
        Didn&apos;t request a reset? You can safely ignore this email — your
        password hasn&apos;t changed.
      </Text>
    </EmailLayout>
  )
}
