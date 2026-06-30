import { ContactJpNotification } from '../components/emails/ContactJpNotification'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <ContactJpNotification {...(PREVIEW_SAMPLES['contact-jp-notification'] as unknown as React.ComponentProps<typeof ContactJpNotification>)} />
}
