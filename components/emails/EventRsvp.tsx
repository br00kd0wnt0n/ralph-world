import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, styles } from './EmailLayout'

interface Props {
  recipientName?: string | null
  eventTitle: string
  /** Formatted date + time, e.g. "Thursday 10 July 2026, 7:00pm" */
  eventDate: string
  eventLocation?: string | null
  /** Full URL to the event page */
  eventUrl: string
}

export function EventRsvp({
  recipientName,
  eventTitle,
  eventDate,
  eventLocation,
  eventUrl,
}: Props) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'
  return (
    <EmailLayout preview={`You're going to ${eventTitle}`}>
      <Text style={styles.h1}>You&apos;re going! 🎟</Text>
      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>
        Your RSVP for <strong>{eventTitle}</strong> is confirmed.
      </Text>
      <Text style={{ ...styles.paragraph, whiteSpace: 'pre-line' }}>
        📅 {eventDate}
        {eventLocation ? (
          <>
            {'\n'}
            📍 {eventLocation}
          </>
        ) : null}
      </Text>
      <Section style={styles.buttonWrap}>
        <Link href={eventUrl} style={styles.button}>
          View event
        </Link>
      </Section>
      <Text style={styles.detail}>
        Can&apos;t make it? You can cancel your RSVP from the event page.
        Questions?{' '}
        <Link href="mailto:hello@ralph.world" style={styles.link}>
          hello@ralph.world
        </Link>
      </Text>
    </EmailLayout>
  )
}
