'use client'

import Link from 'next/link'
import Globe from './Globe'
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
    <footer className="relative">
      {/* Globe — bottom left, overflows top */}
      <div className="absolute z-10" style={{ bottom: 24, left: 24 }}>
        <Globe />
      </div>

      {/* Black bar with pink top border */}
      <div
        className="relative bg-black flex items-center justify-between px-6"
        style={{ height: 103, borderTop: '4px solid #EA128B' }}
      >
        <div />

        {/* Right: Contact + social icons */}
        <div className="flex items-center" style={{ gap: 32 }}>
          <a
            href={contactHref}
            className="text-chrome text-white hover:text-ralph-pink transition-colors"
          >
            Contact us
          </a>
          <a
            href={tiktokUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-icon-btn"
            aria-label="TikTok"
          >
            <img src="/imgs/icon_tiktok.svg" alt="" className="footer-icon" />
          </a>
          <a
            href={instagramUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-icon-btn"
            aria-label="Instagram"
          >
            <img src="/imgs/icon_instagram.svg" alt="" className="footer-icon" />
          </a>
          <a
            href={youtubeUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-icon-btn"
            aria-label="YouTube"
          >
            <img src="/imgs/icon_youtube.svg" alt="" className="footer-icon" />
          </a>
        </div>
      </div>
    </footer>
  )
}
