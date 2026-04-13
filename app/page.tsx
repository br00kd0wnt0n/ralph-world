import { getHomepageData } from '@/lib/data/homepage'
import Hero from '@/components/home/Hero'
import PlanetSection from '@/components/home/PlanetSection'
import FloatingCharacter from '@/components/home/FloatingCharacter'
import MobileHome from '@/components/home/MobileHome'
import Footer from '@/components/layout/Footer'
import type { ModuleCardData } from '@/components/home/PlanetSection'

export const revalidate = 3600

export default async function Home() {
  const { magazineItems, eventItems, labItems } = await getHomepageData()

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
        description:
          'Pop culture stories, interviews and photo essays from the people who make the things we love.',
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
        description:
          'Live events, screenings, parties and pop-ups. Check below for the latest.',
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
        description:
          'Physical magazines, merch and random things we think are brilliant.',
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
        description:
          'Interactive experiments, tools, and weird wonderful things from the Ralph team.',
        items: labItems,
        href: '/lab',
        ctaLabel: 'Show me more',
      },
    },
  ]

  return (
    <>
      <Hero />

      {/* Desktop: Planet sections with floating characters between */}
      <div className="hidden md:block">
        {sections.map((section, i) => (
          <div key={section.id}>
            {i > 0 && (
              <div className="relative h-16 flex justify-center">
                <FloatingCharacter
                  index={i}
                  className="absolute"
                />
              </div>
            )}
            <PlanetSection {...section} />
          </div>
        ))}
      </div>

      {/* Mobile: Linear card layout */}
      <MobileHome
        magazineItems={magazineItems}
        eventItems={eventItems}
        labItems={labItems}
      />

      <Footer variant="dark" />
    </>
  )
}
