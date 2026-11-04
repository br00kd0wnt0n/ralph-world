import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  recipientName?: string | null
  magazineUrl: string
  tvUrl: string
  subscribeUrl: string
}

/**
 * Light welcome for new free members — sent once, when an email/password
 * account is verified or a Google account is created. Until this existed,
 * free members got nothing from us after the verification email.
 * What it lists must match lib/entitlements.ts (TV unlimited once signed in).
 */
export function WelcomeFree({ recipientName, magazineUrl, tvUrl, subscribeUrl }: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <EmailLayout preview="You're in. Here's what Ralph has for you.">
      <Text style={styles.h1}>Welcome to Ralph</Text>
      <hr style={styles.divider} />
      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        You&apos;re in. Your free Ralph account gets you:
      </Text>
      <Text style={styles.paragraph}>
        • <Link href={magazineUrl} style={styles.link}>Ralph Magazine</Link> online: stories,
        interviews and photo essays about pop culture worth caring about.
        <br />• <Link href={tvUrl} style={styles.link}>Ralph TV</Link>, as much as you like,
        whenever you&apos;re signed in.
        <br />• Tickets to our IRL events.
      </Text>
      <Section style={styles.buttonWrap}>
        <Link href={magazineUrl} style={styles.button}>
          Start reading
        </Link>
      </Section>
      <Text style={styles.paragraph}>
        Want Ralph in print? For £3 a month our quarterly magazine comes
        straight through your letterbox, UK postage included.{' '}
        <Link href={subscribeUrl} style={styles.link}>
          See how it works
        </Link>
        .
      </Text>
      <Text style={styles.detail}>
        Questions? Reply to this email or reach us at{' '}
        <Link href="mailto:hello@ralph.world" style={styles.link}>
          hello@ralph.world
        </Link>
        .
      </Text>
    </EmailLayout>
  )
}
