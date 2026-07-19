import type { Metadata } from 'next'
import SectionIntro from '@/components/layout/SectionIntro'
import PlayPlanets from '@/components/play/PlayPlanets'
import ParallaxPlanets from '@/components/play/ParallaxPlanets'
import {
  getPublishedCaseStudies,
  resolveCaseStudyUrl,
} from '@/lib/data/case-studies'
import { getSiteCopy } from '@/lib/data/site-copy'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Work with Us',
  description:
    'Work with Ralph — campaigns, content and culture from the Entertainment People.',
  alternates: { canonical: '/work-with-us' },
  openGraph: {
    title: 'Work with Ralph',
    description: 'Campaigns, content and culture from the Entertainment People.',
  },
}

export default async function PlayWithRalph() {
  const [caseStudies, copy] = await Promise.all([
    getPublishedCaseStudies(),
    getSiteCopy(),
  ])

  const planetItems = caseStudies.map((cs) => ({
    id: cs.id,
    title: cs.title,
    subtitle: cs.subtitle,
    thumbnailUrl: cs.thumbnailUrl,
    url: resolveCaseStudyUrl(cs),
  }))

  const bullets = [
    { heading: copy.play_expertise_1_heading, body: copy.play_expertise_1_body },
    { heading: copy.play_expertise_2_heading, body: copy.play_expertise_2_body },
    { heading: copy.play_expertise_3_heading, body: copy.play_expertise_3_body },
    { heading: copy.play_expertise_4_heading, body: copy.play_expertise_4_body },
  ]

  return (
    <>
      <SectionIntro
        section="play"
        heading={copy.play_hero_heading ?? 'Play with Ralph'}
        lines={[
          copy.play_hero_intro ?? '',
          copy.play_hero_cta_line ?? '',
        ].filter(Boolean)}
      />

      <PlayPlanets items={planetItems} />

      <ParallaxPlanets
        whatsNext={{
          body: copy.play_whats_next_body,
          ctaLabel: copy.play_whats_next_cta_label,
          ctaHref: copy.play_whats_next_cta_href,
        }}
        expertise={{
          intro: copy.play_expertise_intro,
          bullets,
        }}
      />
    </>
  )
}
