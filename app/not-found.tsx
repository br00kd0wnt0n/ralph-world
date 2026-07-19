import type { Metadata } from 'next'
import Button from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    // Transparent section — the page background is already black (body uses
    // --color-background #000000) and the global starfield shows through.
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p
        className="text-ralph-pink"
        style={{
          fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
          fontWeight: 600,
          fontSize: 72,
          lineHeight: 1,
        }}
      >
        404
      </p>
      <h1
        className="mt-4 text-primary"
        style={{
          fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
          fontWeight: 600,
          fontSize: 32,
          lineHeight: 1.1,
        }}
      >
        We can&rsquo;t find that page
      </h1>
      <p className="mt-3 max-w-md text-secondary">
        It may have moved, or the link might be broken. Try heading back home or
        dip into the magazine.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button href="/" label="Back home" filled />
        <Button href="/magazine" label="Read the magazine" />
      </div>
    </section>
  )
}
