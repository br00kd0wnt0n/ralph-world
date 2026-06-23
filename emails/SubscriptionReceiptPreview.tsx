import { SubscriptionReceipt } from '../components/emails/SubscriptionReceipt'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <SubscriptionReceipt {...(PREVIEW_SAMPLES['subscription-receipt'] as unknown as React.ComponentProps<typeof SubscriptionReceipt>)} />
}
