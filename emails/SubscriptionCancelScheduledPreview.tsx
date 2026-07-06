import { SubscriptionCancelScheduled } from '../components/emails/SubscriptionCancelScheduled'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <SubscriptionCancelScheduled {...(PREVIEW_SAMPLES['subscription-cancel-scheduled'] as unknown as React.ComponentProps<typeof SubscriptionCancelScheduled>)} />
}
