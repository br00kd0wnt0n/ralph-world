import type { Metadata } from 'next'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Play with Ralph',
  description:
    'Work with Ralph — the agency arm. Campaigns, content, culture.',
  openGraph: {
    title: 'Play with Ralph',
    description: 'Work with Ralph. Campaigns, content, culture.',
  },
}

export default function PlayWithRalph() {
  return (
    <>
      <section className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Play with Ralph</h1>
        <p className="text-secondary">Content from Chris TBD</p>
      </section>
      <Footer variant="light" />
    </>
  )
}
