import { MagazineShipped } from '../components/emails/MagazineShipped'
import { PREVIEW_SAMPLES } from '../lib/email/preview-samples'

export default function Preview() {
  return <MagazineShipped {...(PREVIEW_SAMPLES['magazine-shipped'] as unknown as React.ComponentProps<typeof MagazineShipped>)} />
}
