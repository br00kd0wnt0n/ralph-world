'use client'

import Link from 'next/link'

interface FooterProps {
  variant?: 'dark' | 'light'
}

export default function Footer({ variant = 'dark' }: FooterProps) {
  if (variant === 'light') {
    return (
      <footer className="bg-surface py-8 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
            <Link
              href="/contact"
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Contact us
            </Link>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary transition-colors"
              aria-label="TikTok"
            >
              TikTok
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary transition-colors"
              aria-label="Instagram"
            >
              Instagram
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary transition-colors"
              aria-label="YouTube"
            >
              YouTube
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
            <Link href="/subscribe" className="hover:text-primary transition-colors">
              Sign up
            </Link>
            <span>|</span>
            <Link href="/play" className="hover:text-primary transition-colors">
              Hey. Aren&apos;t you an agency?
            </Link>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="relative bg-[#1A0A2E] pt-32 pb-8 px-6 overflow-hidden">
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
            stroke="#FF2D6B"
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
        {/* ralph logo placeholder */}
        <div className="w-32 h-12 bg-ralph-pink/20 rounded flex items-center justify-center text-ralph-pink font-bold text-xl mb-4">
          ralph
        </div>
        <p className="text-sm text-white/60 tracking-widest uppercase">
          The Entertainment People
        </p>
      </div>

      {/* London globe placeholder — bottom left */}
      <div className="absolute bottom-4 left-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-[7px] text-muted">
        globe
      </div>
    </footer>
  )
}
