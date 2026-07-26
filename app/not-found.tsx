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
        className="text-ralph-pink light:text-black"
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
        {/* Back home — a shadow button matching <Button>, but theme-flipped via
            classes (which <Button>'s inline styles can't do): pink fill in dark
            mode, off-black fill + white text in light mode. */}
        <div className="relative inline-block" style={{ width: 'fit-content' }}>
          <div
            aria-hidden="true"
            className="absolute bg-black pointer-events-none"
            style={{ top: 4, left: 4, width: '100%', height: '100%' }}
          />
          <a
            href="/"
            className="btn-press relative inline-flex items-center justify-center border-2 border-black bg-ralph-pink light:bg-[#232323] text-black light:text-white"
            style={{
              height: 43,
              minWidth: 170,
              paddingLeft: 12,
              paddingRight: 12,
              fontFamily: "var(--font-intro, 'Gooper Trial'), serif",
              fontWeight: 600,
              fontSize: 16,
              lineHeight: 1,
              transition: 'transform 0.15s ease',
            }}
          >
            Back home
          </a>
        </div>
        <Button href="/magazine" label="Read the magazine" />
      </div>
    </section>
  )
}
