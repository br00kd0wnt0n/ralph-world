import { getHomepageData, getPlanetImages } from '@/lib/data/homepage'
import { getSiteCopy } from '@/lib/data/site-copy'
import Hero from '@/components/home/Hero'
import PlanetSection from '@/components/home/PlanetSection'
import FooterPlanet from '@/components/home/FooterPlanet'
import CanvasStage from '@/components/anim/CanvasStage'
import type { ModuleCardData } from '@/components/home/PlanetSection'
import type { Metadata } from 'next'

export const revalidate = 60

export const metadata: Metadata = {
  // `absolute` bypasses the layout's "%s | Ralph" template on the home page.
  title: { absolute: 'Ralph — The Entertainment People' },
  description:
    'Ralph.World — pop culture for the fun of it. Magazine, TV, events, shop, and lab.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Ralph — The Entertainment People',
    description:
      'Pop culture for the fun of it. Magazine, TV, events, shop, and lab.',
    url: '/',
  },
}

export default async function Home() {
  const [
    { magazineItems, eventItems, labItems, tvItems, shopItems },
    copy,
    planetImages,
  ] = await Promise.all([getHomepageData(), getSiteCopy(), getPlanetImages()])

  const tvFallback: ModuleCardData['items'] = [
    { id: 'tv-fallback-1', title: 'Tune in later', badge: 'OFFLINE' },
  ]

  const sections: {
    id: string
    label: string
    tagline: string
    accentColor: string
    planetPosition: 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right'
    moduleCard: ModuleCardData
  }[] = [
    {
      id: 'tv',
      label: copy.tv_hero_heading,
      tagline: 'Switch on, tune in',
      accentColor: '#7B3FE4',
      planetPosition: 'upper-right',
      moduleCard: {
        heading: copy.tv_hero_heading,
        tagline: 'Switch on, tune in',
        description: copy.tv_description,
        items: tvItems.length > 0 ? tvItems : tvFallback,
        href: '/tv',
        ctaLabel: 'Watch now',
      },
    },
    {
      id: 'magazine',
      label: 'Magazine',
      tagline: 'Our fun, glossy mag',
      accentColor: 'var(--color-ralph-orange)',
      planetPosition: 'lower-left',
      moduleCard: {
        heading: 'Magazine',
        tagline: 'Words and pictures',
        description: copy.magazine_description,
        items: magazineItems,
        href: '/magazine',
        ctaLabel: 'Show me more',
      },
    },
    {
      id: 'events',
      label: 'Events',
      tagline: "Let's meet up",
      accentColor: '#5FBCBF',
      planetPosition: 'lower-right',
      moduleCard: {
        heading: 'Events',
        tagline: 'For real. IRL.',
        description: copy.events_description,
        items: eventItems,
        href: '/events',
        ctaLabel: 'Show me more',
      },
    },
    {
      id: 'shop',
      label: 'Shop',
      tagline: 'Buy Ralph stuff',
      accentColor: '#44B758',
      planetPosition: 'lower-left',
      moduleCard: {
        heading: 'Shop',
        tagline: 'Merch, mags and more',
        description: copy.shop_description,
        items:
          shopItems.length > 0
            ? shopItems
            : [
                { id: 'shop-1', title: 'Coming soon...' },
                { id: 'shop-2', title: 'More products on the way' },
              ],
        href: '/shop',
        ctaLabel: 'Show me more',
      },
    },
    {
      id: 'lab',
      label: 'Lab',
      tagline: 'Experiments in fun',
      accentColor: '#FBC000',
      planetPosition: 'lower-right',
      moduleCard: {
        heading: 'Lab',
        tagline: 'Try something new',
        description: copy.lab_description,
        items: labItems,
        href: '/lab',
        ctaLabel: 'Show me more',
      },
    },
  ]

  return (
    <>
      {/* Page h1 — the hero "title" is decorative art, so this visually-hidden
          heading gives the home page its required single top-level heading. */}
      <h1 className="sr-only">Ralph — pop culture for the fun of it</h1>
      <Hero
        heading={copy.home_hero_heading}
        line1={copy.home_hero_line_1}
        line2={copy.home_hero_line_2}
        line3={copy.home_hero_line_3}
        themeKey={copy.home_hero_theme}
      />

      {/* TEMP: canvas sprite stage — alien squad + satellite */}
      <CanvasStage />

      {sections.map((section) => (
        <PlanetSection
          key={section.id}
          {...section}
          planetImageUrl={
            planetImages[section.id as keyof typeof planetImages] ?? null
          }
        />
      ))}

      {/* Footer planet — homepage only */}
      <FooterPlanet tagline={copy.footer_tagline ?? 'The Entertainment People'} />
    </>
  )
}
