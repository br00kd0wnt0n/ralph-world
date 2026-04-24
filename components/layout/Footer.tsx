'use client'

import Link from 'next/link'
import type { SiteCopy } from '@/lib/data/site-copy'

interface FooterProps {
  variant?: 'dark' | 'light'
  copy?: Partial<SiteCopy>
}

export default function Footer({ variant = 'dark', copy }: FooterProps) {
  const tagline = copy?.footer_tagline ?? 'The Entertainment People'
  const agencyCta = copy?.footer_agency_cta ?? "Hey. Aren't you an agency?"
  const contactHref = copy?.footer_contact_email || '/contact'
  const tiktokUrl = copy?.footer_tiktok_url
  const instagramUrl = copy?.footer_instagram_url
  const youtubeUrl = copy?.footer_youtube_url

  if (variant === 'light') {
    return (
      <footer className="bg-surface py-8 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
            <a
              href={contactHref}
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Contact us
            </a>
            {tiktokUrl && (
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-primary transition-colors"
                aria-label="TikTok"
              >
                TikTok
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                Instagram
              </a>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                YouTube
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
            <Link href="/subscribe" className="hover:text-primary transition-colors">
              Sign up
            </Link>
            <span>|</span>
            <Link href="/play" className="hover:text-primary transition-colors">
              {agencyCta}
            </Link>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="relative overflow-hidden" style={{ paddingTop: 180 }}>
      {/* Planet section with logo + tagline overlaid */}
      <div className="relative flex justify-center" style={{ marginBottom: -1 }}>
        <img
          src="/imgs/footer_planet.png"
          alt=""
          style={{ width: 2898 / 2, height: 484 / 2 }}
          className="max-w-none"
        />
        {/* Logo + text centred on the planet */}
        <div className="absolute inset-0 flex flex-col items-center justify-end" style={{ paddingBottom: 28 }}>
          <img
            src="/ralph-wordmark.png"
            alt="ralph"
            style={{ height: 76, width: 'auto', filter: 'brightness(0)' }}
            className="mb-3"
          />
          <img
            src="/imgs/text_the_entertainment_people.png"
            alt={tagline}
            style={{ width: 958 / 2, height: 79 / 2 }}
          />
        </div>
      </div>

      {/* Black bar with pink top border */}
      <div
        className="relative bg-black flex items-center justify-center px-6"
        style={{ height: 103, borderTop: '4px solid #EA128B' }}
      >
        <div className="flex items-center gap-5">
          <a
            href={contactHref}
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            Contact us
          </a>
          {tiktokUrl && (
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-colors"
              aria-label="TikTok"
            >
              TikTok
            </a>
          )}
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Instagram"
            >
              Instagram
            </a>
          )}
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-colors"
              aria-label="YouTube"
            >
              YouTube
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
