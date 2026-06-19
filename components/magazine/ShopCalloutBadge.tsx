'use client'

interface ShopCalloutBadgeProps {
  href: string
  label: string
  eyebrow?: string | null
  cta?: string | null
}

const DEFAULT_EYEBROW = 'AS SEEN IN RALPH'
const DEFAULT_CTA = 'SHOP NOW →'

/**
 * Starburst-style shop callout linking out to the shop.
 * Eyebrow + label + CTA are all editor-controlled; blanks fall back to the
 * defaults above. Placeholder visual — designer will replace the SVG.
 */
export default function ShopCalloutBadge({
  href,
  label,
  eyebrow,
  cta,
}: ShopCalloutBadgeProps) {
  const eyebrowText = (eyebrow?.trim() || DEFAULT_EYEBROW)
  const ctaText = (cta?.trim() || DEFAULT_CTA)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Shop: ${label}`}
      className="group relative inline-flex items-center justify-center"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-44 h-44 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6"
        aria-hidden="true"
      >
        <polygon
          points="
            100,4 112,32 138,12 138,44 170,38 158,68 192,72 168,92
            196,108 162,118 184,148 152,148 158,182 128,164 120,196
            100,170 80,196 72,164 42,182 48,148 16,148 38,118 4,108
            32,92 8,72 42,68 30,38 62,44 62,12 88,32
          "
          fill="#FF4FA0"
          stroke="#0B0B0B"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle
          cx="100"
          cy="100"
          r="62"
          fill="none"
          stroke="#0B0B0B"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
      </svg>

      <span
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
        style={{ fontFamily: "'Gooper Trial', serif" }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/80 leading-none mb-1">
          {eyebrowText}
        </span>
        <span className="text-sm font-bold text-black leading-tight line-clamp-3">
          {label}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-black/70 mt-1">
          {ctaText}
        </span>
      </span>
    </a>
  )
}
