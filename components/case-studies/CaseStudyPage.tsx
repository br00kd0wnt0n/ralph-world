import Link from 'next/link'
import { isSafeUrl } from '@/lib/safe-url'
import type {
  CaseStudyFull,
  CaseStudyMedia,
  CaseStudySection,
} from '@/lib/data/case-studies'

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

// The viewer stored section.media as EITHER a single object OR an array.
// Normalise before rendering so downstream code only handles one shape.
function mediaItems(section: CaseStudySection): CaseStudyMedia[] {
  const m = section.media
  if (!m) return []
  if (Array.isArray(m)) return m.filter((x) => x && x.url)
  return m.url ? [m] : []
}

function mediaKind(m: CaseStudyMedia): 'video' | 'image' {
  if (m.type === 'video') return 'video'
  const url = m.url ?? ''
  if (/\.(mp4|mov|webm)(?:$|\?)/i.test(url)) return 'video'
  return 'image'
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
      {/* Breadcrumb back to work-with-us */}
      <div className="mb-8">
        <Link
          href="/work-with-us"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Back to Work with Ralph
        </Link>
      </div>

      {/* Hero */}
      <header className="text-center mb-24">
        {isSafeMediaUrl(study.clientLogoUrl) && (
          // Client logos aren't fixed-ratio — a fixed max-h keeps big
          // horizontal logos and tall square marks from wrecking the
          // hero rhythm.
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

      {/* Sections */}
      <div className="space-y-24 sm:space-y-32">
        {study.sections.map((section, i) => {
          const media = mediaItems(section)
          const hasMedia = media.length > 0
          const isHero = hasMedia && !!section.heroMedia
          const isEven = i % 2 === 0
          const key = section.id ?? `section-${i}`

          const copyBlock = (
            <div className="max-w-xl">
              {section.label && (
                <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
                  {section.label}
                </h2>
              )}
              {section.copy && (
                <p className="whitespace-pre-wrap text-white/85 leading-relaxed">
                  {section.copy}
                </p>
              )}
              {section.launchUrl && isSafeUrl(section.launchUrl) && (
                <div className="mt-6">
                  <a
                    href={section.launchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full px-5 py-2 text-sm font-semibold transition-transform hover:scale-105"
                    style={{
                      background: ctaColor,
                      color: '#0a0a0a',
                    }}
                  >
                    View →
                  </a>
                </div>
              )}
            </div>
          )

          const mediaBlock = hasMedia ? (
            <SectionMedia items={media} />
          ) : null

          if (isHero) {
            return (
              <section key={key} className="flex flex-col items-center gap-8">
                <div className="w-full max-w-4xl">{mediaBlock}</div>
                <div className="text-center">{copyBlock}</div>
              </section>
            )
          }
          if (!hasMedia) {
            return (
              <section key={key} className="flex justify-center">
                {copyBlock}
              </section>
            )
          }
          return (
            <section
              key={key}
              className={`grid grid-cols-1 md:grid-cols-2 items-center gap-8 sm:gap-12 ${
                isEven ? '' : 'md:[&>*:first-child]:order-2'
              }`}
            >
              <div className="min-w-0">{copyBlock}</div>
              <div className="min-w-0">{mediaBlock}</div>
            </section>
          )
        })}
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
        <p className="mx-auto max-w-xl text-white/70 mb-8">{outroSubtitle}</p>
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

function SectionMedia({ items }: { items: CaseStudyMedia[] }) {
  const safe = items.filter((m) => isSafeMediaUrl(m.url))
  if (safe.length === 0) return null

  if (safe.length === 1) {
    return renderSingle(safe[0])
  }
  // Multi-item: responsive grid — 1 col on mobile, up to 3 col on desktop
  // depending on count. Keeps thumbnail rows tidy without needing a
  // client-side carousel for MVP.
  const cols = safe.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3`}>
      {safe.map((m, i) => (
        <div key={m.id ?? `m-${i}`} className="rounded-lg overflow-hidden bg-black/30">
          {renderSingle(m)}
        </div>
      ))}
    </div>
  )
}

function renderSingle(m: CaseStudyMedia) {
  const kind = mediaKind(m)
  if (kind === 'video') {
    return (
      <video
        src={m.url}
        controls
        playsInline
        preload="metadata"
        className="w-full h-auto rounded-lg bg-black"
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={m.url}
      alt={m.alt ?? ''}
      className="w-full h-auto rounded-lg"
      loading="lazy"
    />
  )
}
