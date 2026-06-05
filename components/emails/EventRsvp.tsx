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
    <Html>
      <Head />
      <Preview>You&apos;re going to {eventTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            You&apos;re going! 🎟
          </Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Your RSVP for <strong>{eventTitle}</strong> is confirmed.
          </Text>
          <Text style={detailText}>
            📅 {eventDate}
            {eventLocation ? (
              <>
                {'\n'}
                📍 {eventLocation}
              </>
            ) : null}
          </Text>
          <Section style={section}>
            <Link href={eventUrl} style={button}>
              View event
            </Link>
          </Section>
          <Text style={footer}>
            Can&apos;t make it? You can cancel your RSVP from the event page. Questions?{' '}
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
const detailText = { fontSize: '16px', lineHeight: 1.8, whiteSpace: 'pre-line' as const }
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
