import type { Metadata } from 'next'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Ralph team.',
}

export default function ContactPage() {
  return (
    <>
      <section className="px-6 py-20 max-w-xl mx-auto text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-6 font-[family-name:var(--font-display)]">
          Get in touch
        </h1>
        <p className="text-secondary mb-4">
          We love hearing from readers, viewers, collaborators, and
          people who just want to say hi.
        </p>
        <a
          href="mailto:hello@ralph.world"
          className="inline-block rounded-full bg-ralph-pink px-8 py-3 text-white font-medium hover:bg-ralph-pink/90 transition-colors"
        >
          hello@ralph.world
        </a>
      </section>
      <Footer variant="dark" />
    </>
  )
}
