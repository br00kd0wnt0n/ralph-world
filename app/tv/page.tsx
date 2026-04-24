import type { Metadata } from 'next'
import { getSiteCopy } from '@/lib/data/site-copy'
import RalphTVClient from '@/components/tv/RalphTVClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Ralph TV',
  description:
    'Live and on-demand — Ralph TV streams culture, interviews, and nonsense around the clock.',
  openGraph: {
    title: 'Ralph TV',
    description:
      'Live and on-demand. Culture, interviews, and nonsense around the clock.',
  },
}

export default async function RalphTVPage() {
  const copy = await getSiteCopy()

  return (
    <RalphTVClient
      heading={copy.tv_hero_heading}
      intro={copy.tv_hero_intro}
      offlineLabel={copy.tv_offline_label}
      offlineMessage={copy.tv_offline_message}
      subscribeHeading={copy.tv_subscribe_heading}
      subscribeBody={copy.tv_subscribe_body}
      themeKey={copy.tv_hero_theme}
      copy={copy}
    />
  )
}
