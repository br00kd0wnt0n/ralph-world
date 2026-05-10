'use client'

import Link from 'next/link'
import { motion, MotionValue } from 'framer-motion'

interface WhatsNextPlanetProps {
  body: string
  ctaLabel: string
  ctaHref: string
  shadowY?: MotionValue<number>
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
  shadowY,
}: WhatsNextPlanetProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Planet background - absolutely positioned */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          height: 'calc(100% + 260px)',
          width: 'auto',
          aspectRatio: '1 / 1',
        }}
      >
        <img
          src="/imgs/planet_creative_2.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-contain"
        />
        {/* Shadow - positioned at right of planet */}
        {shadowY && (
          <motion.img
            src="/imgs/planet_shadow.png"
            alt=""
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              width: '50%',
              height: 'auto',
              right: 0,
              top: '50%',
              y: shadowY,
              willChange: 'transform',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="relative z-20 text-right text-black w-[380px] py-8"
        style={{
          fontFamily: "'Gooper Trial', serif",
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: 0,
        }}
      >
        {renderBodyWithInlineCta(body, ctaLabel, ctaHref)}
      </div>
    </div>
  )
}
