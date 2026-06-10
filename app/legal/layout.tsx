import type { Metadata } from 'next'
import LegalNav from './LegalNav'

export const metadata: Metadata = {
  title: { default: 'Legal', template: '%s | Ralph.world' },
  robots: { index: true, follow: true },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 py-12 sm:py-20">
      {/* Solid white "document" sheet centred on the site's dark canvas. */}
      <div className="max-w-3xl mx-auto bg-white text-black rounded-2xl shadow-xl px-6 sm:px-12 py-10 sm:py-14">
        <LegalNav />
        {/* Default (dark-on-light) prose for the white sheet. Brand-pink links
            and code; black bold headings; table borders kept subtle. */}
        <div className="legal-prose prose prose-sm sm:prose-base max-w-none [&_a]:text-ralph-pink [&_a]:underline [&_table]:text-sm [&_th]:border-black/15 [&_td]:border-black/10 [&_code]:text-ralph-pink">
          {children}
        </div>
      </div>
    </div>
  )
}
