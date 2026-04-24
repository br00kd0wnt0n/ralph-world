'use client'

import Link from 'next/link'

interface WhatsNextPlanetProps {
  body: string
  ctaLabel: string
  ctaHref: string
}

// The pink "What's next?" planet. The body copy is stored as plain text in
// the CMS; we render paragraphs on blank-line breaks and highlight the CTA
// label as an inline link wherever it appears in the copy.
function renderBodyWithInlineCta(
  body: string,
  ctaLabel: string,
  ctaHref: string
) {
  const paragraphs = body.split(/\n\s*\n/)
  return paragraphs.map((p, i) => {
    if (!ctaLabel || !p.includes(ctaLabel)) {
      return (
        <p key={i} className="mb-4 last:mb-0">
          {p}
        </p>
      )
    }
    const [before, after] = p.split(ctaLabel)
    return (
      <p key={i} className="mb-4 last:mb-0">
        {before}
        <Link href={ctaHref} className="underline font-bold hover:text-black/70">
          {ctaLabel}
        </Link>
        {after}
      </p>
    )
  })
}

export default function WhatsNextPlanet({
  body,
  ctaLabel,
  ctaHref,
}: WhatsNextPlanetProps) {
  return (
    <div className="relative w-full md:w-[540px] aspect-square rounded-full bg-ralph-pink shadow-[0_0_40px_rgba(255,32,152,0.4)] flex items-center justify-center p-12 md:p-16">
      <div className="text-center text-black text-sm md:text-base leading-relaxed font-medium max-w-[70%]">
        {renderBodyWithInlineCta(body, ctaLabel, ctaHref)}
      </div>
    </div>
  )
}
