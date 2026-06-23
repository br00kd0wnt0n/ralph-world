import { EventRsvp } from '../components/emails/EventRsvp'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <EventRsvp {...(PREVIEW_SAMPLES['event-rsvp'] as unknown as React.ComponentProps<typeof EventRsvp>)} />
}
