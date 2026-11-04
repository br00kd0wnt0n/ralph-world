import { WelcomeFree } from '../components/emails/WelcomeFree'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <WelcomeFree {...(PREVIEW_SAMPLES['welcome-free'] as unknown as React.ComponentProps<typeof WelcomeFree>)} />
}
