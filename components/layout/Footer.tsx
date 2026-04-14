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
    <footer className="relative bg-black pt-32 pb-8 px-6 overflow-hidden">
      {/* Pink arch */}
      <div className="absolute top-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 200"
          className="w-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0,200 Q720,0 1440,200"
            fill="none"
            stroke="#FF2098"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Character placeholders on arch */}
      <div className="absolute top-8 left-1/4 w-16 h-16 bg-ralph-pink/10 rounded-full flex items-center justify-center text-[8px] text-muted">
        char
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-ralph-teal/10 rounded-full flex items-center justify-center text-[8px] text-muted">
        char
      </div>
      <div className="absolute top-8 right-1/4 w-16 h-16 bg-ralph-yellow/10 rounded-full flex items-center justify-center text-[8px] text-muted">
        char
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <img
          src="/ralph-logo.png"
          alt="ralph world"
          width={80}
          height={80}
          className="rounded-full mb-4"
        />
        <p className="text-sm text-white/60 tracking-widest uppercase">
          {tagline}
        </p>
      </div>

      {/* London globe placeholder — bottom left */}
      <div className="absolute bottom-4 left-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-[7px] text-muted">
        globe
      </div>
    </footer>
  )
}
