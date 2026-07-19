import type { Metadata } from 'next'
import { getSiteCopy, getTvPreviewSettings } from '@/lib/data/site-copy'
import RalphTVClient from '@/components/tv/RalphTVClient'

// Force dynamic so the freeview gate setting is always read live. The page
// was previously ISR-cached (revalidate=60), which baked previewEnabled
// into a stale prerender — toggling the gate in the CMS didn't reliably
// surface here. The bulk copy still comes from the cached getSiteCopy;
// only the gate flag is read fresh via getTvPreviewSettings().
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ralph TV',
  description:
    'Live and on-demand — Ralph TV streams culture, interviews, and nonsense around the clock.',
  alternates: { canonical: '/tv' },
  openGraph: {
    title: 'Ralph TV',
    description:
      'Live and on-demand. Culture, interviews, and nonsense around the clock.',
    url: '/tv',
  },
}

export default async function RalphTVPage() {
  const [copy, preview] = await Promise.all([
    getSiteCopy(),
    getTvPreviewSettings(),
  ])

  return (
    <RalphTVClient
      heading={copy.tv_hero_heading}
      intro={copy.tv_hero_intro}
      offlineLabel={copy.tv_offline_label}
      offlineMessage={copy.tv_offline_message}
      subscribeHeading={copy.tv_subscribe_heading}
      subscribeBody={copy.tv_subscribe_body}
      previewEnabled={preview.enabled}
      previewSeconds={preview.seconds}
      copy={copy}
    />
  )
}
