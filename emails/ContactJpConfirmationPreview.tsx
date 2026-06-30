import { ContactJpConfirmation } from '../components/emails/ContactJpConfirmation'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <ContactJpConfirmation {...(PREVIEW_SAMPLES['contact-jp-confirmation'] as unknown as React.ComponentProps<typeof ContactJpConfirmation>)} />
}
