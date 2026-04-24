import type { Metadata } from 'next'
import Footer from '@/components/layout/Footer'
import PlayPlanets from '@/components/play/PlayPlanets'
import WhatsNextPlanet from '@/components/play/WhatsNextPlanet'
import ExpertisePlanet from '@/components/play/ExpertisePlanet'
import {
  getPublishedCaseStudies,
  resolveCaseStudyUrl,
} from '@/lib/data/case-studies'
import { getSiteCopy } from '@/lib/data/site-copy'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Play with Ralph',
  description:
    'Work with Ralph — the agency arm. Campaigns, content, culture.',
  openGraph: {
    title: 'Play with Ralph',
    description: 'Work with Ralph. Campaigns, content, culture.',
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
      <section className="px-6 pt-10 md:pt-16 pb-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4 font-[family-name:var(--font-display)]">
          {copy.play_hero_heading}
        </h1>
        <p className="text-secondary text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
          {copy.play_hero_intro}
        </p>
        <p className="text-secondary text-sm md:text-base mt-6">
          {copy.play_hero_cta_line}
        </p>
      </section>

      <PlayPlanets items={planetItems} />

      <section className="relative px-6 py-16 md:py-24">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 md:gap-[-60px] items-center justify-center">
          <div className="md:-mr-20 md:mt-20 z-10">
            <WhatsNextPlanet
              body={copy.play_whats_next_body}
              ctaLabel={copy.play_whats_next_cta_label}
              ctaHref={copy.play_whats_next_cta_href}
            />
          </div>
          <div className="md:-ml-20 z-20">
            <ExpertisePlanet intro={copy.play_expertise_intro} bullets={bullets} />
          </div>
        </div>
      </section>

      <Footer variant="dark" copy={copy} />
    </>
  )
}
