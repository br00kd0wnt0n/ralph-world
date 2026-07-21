import Link from 'next/link'
import { isSafeUrl } from '@/lib/safe-url'
import type {
  CaseStudyFull,
  CaseStudyMedia,
  CaseStudySection,
} from '@/lib/data/case-studies'
import CaseStudyCarousel from './CaseStudyCarousel'

const DEFAULT_BRAND_COLORS = [
  '#e17b77',
  '#f9ca24',
  '#4a90c4',
  '#6ab04c',
  '#e17bce',
]

interface Props {
  study: CaseStudyFull
}

// Viewer exports stored section.media as either an array or a single
// object; normalise both before rendering so downstream code only
// handles one shape.
function mediaItems(section: CaseStudySection): CaseStudyMedia[] {
  const m = section.media
  if (!m) return []
  if (Array.isArray(m)) return m.filter((x) => x && x.url)
  return m.url ? [m] : []
}

function isSafeMediaUrl(u: string | null | undefined): u is string {
  return typeof u === 'string' && isSafeUrl(u)
}

export default function CaseStudyPage({ study }: Props) {
  const brand =
    study.brandColors.length > 0 ? study.brandColors : DEFAULT_BRAND_COLORS
  const accent = study.subtitleColor || brand[1] || DEFAULT_BRAND_COLORS[1]
  const ctaColor = study.ctaColor || brand[0] || DEFAULT_BRAND_COLORS[0]
  const outroHeading = study.outroHeading || 'Get in touch'
  const outroSubtitle =
    study.outroSubtitle ||
    "Got a brief or an idea you want to brainstorm? Let's create something extraordinary together."

  return (
    <article className="mx-auto max-w-6xl px-4 py-16 sm:py-24 text-white">
      <div className="mb-8">
        <Link
          href="/work-with-us"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Back to Work with Ralph
        </Link>
      </div>

      {/* Hero */}
      <header className="text-center mb-24 sm:mb-32">
        {isSafeMediaUrl(study.clientLogoUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={study.clientLogoUrl}
            alt={study.title ?? ''}
            className="mx-auto mb-8 max-h-24 w-auto object-contain"
          />
        )}
        {study.title && (
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">
            {study.title}
          </h1>
        )}
        {study.subtitle && (
          <p
            className="text-xl sm:text-2xl font-medium"
            style={{ color: accent }}
          >
            {study.subtitle}
          </p>
        )}
        {study.tags.length > 0 && (
          <ul className="mt-8 flex flex-wrap justify-center gap-2 list-none p-0">
            {study.tags.map((tag, i) => {
              const c = brand[i % brand.length]
              return (
                <li key={`${tag}-${i}`}>
                  <span
                    className="inline-block rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide"
                    style={{
                      color: c,
                      borderColor: c,
                      background: `${c}15`,
                    }}
                  >
                    {tag}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </header>

      {/* Sections — alternating layout matching the viewer:
          - Hero sections: full-width media on top, copy centred below
          - Non-hero: copy 55% / media 45%, alternating left/right
          - Mobile: stack vertically */}
      <div className="space-y-24 sm:space-y-32">
        {study.sections.map((section, i) => (
          <SectionRow
            key={section.id ?? `section-${i}`}
            section={section}
            index={i}
            ctaColor={ctaColor}
          />
        ))}
      </div>

      {/* Outro */}
      <footer className="mt-32 text-center">
        <div
          className="mx-auto mb-8 h-px w-32"
          style={{
            background: `linear-gradient(90deg, transparent, ${brand[0] || '#e17b77'}88, transparent)`,
          }}
        />
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{outroHeading}</h2>
        <p className="mx-auto max-w-xl text-white/70 mb-8 whitespace-pre-wrap">
          {outroSubtitle}
        </p>
        <Link
          href="/contact"
          className="inline-block rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-105"
          style={{
            background: ctaColor,
            color: '#0a0a0a',
          }}
        >
          Get in touch →
        </Link>
      </footer>
    </article>
  )
}

interface SectionRowProps {
  section: CaseStudySection
  index: number
  ctaColor: string
}

function SectionRow({ section, index, ctaColor }: SectionRowProps) {
  const items = mediaItems(section).filter((m) => isSafeMediaUrl(m.url))
  const hasMedia = items.length > 0
  const isEven = index % 2 === 0
  const isHero = hasMedia && !!section.heroMedia

  const copy = (
    <div className={`max-w-xl ${isHero ? 'mx-auto text-center' : ''}`}>
      {section.label && (
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/50 mb-4">
          {section.label}
        </h2>
      )}
      {section.copy && (
        <p className="whitespace-pre-wrap text-white/85 leading-relaxed text-lg sm:text-xl">
          {section.copy}
        </p>
      )}
      {section.launchUrl && isSafeUrl(section.launchUrl) && (
        <div className={`mt-6 ${isHero ? 'flex justify-center' : ''}`}>
          <a
            href={section.launchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-transform hover:scale-105"
            style={{
              background: ctaColor,
              color: '#0a0a0a',
              boxShadow: `0 4px 20px ${ctaColor}55`,
            }}
          >
            Click to Launch →
          </a>
        </div>
      )}
    </div>
  )

  if (isHero) {
    return (
      <section className="flex flex-col items-center gap-10">
        <div className="w-full max-w-4xl">
          <CaseStudyCarousel items={items} anchorSide="right" />
        </div>
        {copy}
      </section>
    )
  }
  if (!hasMedia) {
    return <section className="flex justify-center">{copy}</section>
  }
  // Non-hero: alternating flex row/row-reverse — 55% copy / 45% media
  // matches the viewer's default width split. Stacks on mobile.
  const anchorSide = isEven ? 'right' : 'left'
  return (
    <section
      className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-10 md:gap-16`}
    >
      <div className="w-full md:basis-[55%] md:shrink md:grow-0 min-w-0 flex justify-center md:justify-start">
        {copy}
      </div>
      <div className="w-full md:basis-[45%] md:shrink md:grow-0 min-w-0">
        <CaseStudyCarousel items={items} anchorSide={anchorSide} />
      </div>
    </section>
  )
}
