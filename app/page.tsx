import Footer from '@/components/layout/Footer'
import ScrollIndicator from '@/components/home/ScrollIndicator'

export default function Home() {
  return (
    <>
      <section className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 font-[family-name:var(--font-display)]">
          Welcome to our World
        </h1>
        <p className="max-w-lg text-secondary text-lg mb-4">
          Pop culture for the fun of it.
        </p>
        <p className="max-w-lg text-secondary mb-4">
          Ralph is an entertainment brand that celebrates the things we love —
          through a quarterly magazine, live TV channel, events, shop, and lab.
        </p>
        <p className="max-w-lg text-secondary mb-8">
          Stick around. Scroll down. See what we&apos;re about.
        </p>

        <ScrollIndicator />
      </section>

      {/* Planet sections — Phase 2 */}

      <Footer variant="dark" />
    </>
  )
}
