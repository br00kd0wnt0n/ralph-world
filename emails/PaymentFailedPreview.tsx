import { PaymentFailed } from '../components/emails/PaymentFailed'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <PaymentFailed {...(PREVIEW_SAMPLES['payment-failed'] as unknown as React.ComponentProps<typeof PaymentFailed>)} />
}
