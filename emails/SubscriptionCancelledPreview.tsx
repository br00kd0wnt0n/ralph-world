import { SubscriptionCancelled } from '../components/emails/SubscriptionCancelled'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <SubscriptionCancelled {...(PREVIEW_SAMPLES['subscription-cancelled'] as unknown as React.ComponentProps<typeof SubscriptionCancelled>)} />
}
