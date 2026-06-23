import { PasswordReset } from '../components/emails/PasswordReset'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <PasswordReset {...(PREVIEW_SAMPLES['password-reset'] as unknown as React.ComponentProps<typeof PasswordReset>)} />
}
