import { EmailVerification } from '../components/emails/EmailVerification'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <EmailVerification {...(PREVIEW_SAMPLES['email-verification'] as unknown as React.ComponentProps<typeof EmailVerification>)} />
}
