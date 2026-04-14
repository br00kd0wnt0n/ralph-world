import { getHomepageData } from '@/lib/data/homepage'
import { getSiteCopy } from '@/lib/data/site-copy'
import Hero from '@/components/home/Hero'
import PlanetSection from '@/components/home/PlanetSection'
import FloatingCharacter from '@/components/home/FloatingCharacter'
import MobileHome from '@/components/home/MobileHome'
import Footer from '@/components/layout/Footer'
import type { ModuleCardData } from '@/components/home/PlanetSection'

export const revalidate = 60

export default async function Home() {
  const [{ magazineItems, eventItems, labItems }, copy] = await Promise.all([
    getHomepageData(),
    getSiteCopy(),
  ])

  const sections: {
    id: string
    label: string
    tagline: string
    accentColor: string
    planetPosition: 'upper-right' | 'lower-left' | 'lower-right'
    moduleCard: ModuleCardData
  }[] = [
    {
      id: 'magazine',
      label: 'Magazine',
      tagline: 'Our fun, glossy mag',
      accentColor: '#FF6B35',
      planetPosition: 'upper-right',
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
      accentColor: '#00C4B4',
      planetPosition: 'lower-left',
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
      accentColor: '#4CAF50',
      planetPosition: 'lower-right',
      moduleCard: {
        heading: 'Shop',
        tagline: 'Merch, mags and more',
        description: copy.shop_description,
        items: [
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
      accentColor: '#FFE566',
      planetPosition: 'lower-left',
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
      <Hero
        heading={copy.home_hero_heading}
        line1={copy.home_hero_line_1}
        line2={copy.home_hero_line_2}
        line3={copy.home_hero_line_3}
      />

      <div className="hidden md:block">
        {sections.map((section, i) => (
          <div key={section.id}>
            {i > 0 && (
              <div className="relative h-16 flex justify-center">
                <FloatingCharacter index={i} className="absolute" />
              </div>
            )}
            <PlanetSection {...section} />
          </div>
        ))}
      </div>

      <MobileHome
        magazineItems={magazineItems}
        eventItems={eventItems}
        labItems={labItems}
        copy={copy}
      />

      <Footer variant="dark" copy={copy} />
    </>
  )
}
