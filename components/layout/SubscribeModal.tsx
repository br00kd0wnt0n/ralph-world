'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'

interface SubscribeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SubscribeModal({ isOpen, onClose }: SubscribeModalProps) {
  const [isLoading, setIsLoading] = useState<'free' | 'paid' | null>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setIsLoading(null)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  function handleFreeSignup() {
    setIsLoading('free')
    signIn('google', { callbackUrl: '/' })
  }

  function handlePaidSignup() {
    setIsLoading('paid')
    signIn('google', { callbackUrl: '/account?upgrade=paid' })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 bg-surface border border-border/50 rounded-2xl shadow-2xl w-full max-w-lg my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 flex items-center justify-center text-sm transition-colors z-10"
          aria-label="Close"
        >
          &#10005;
        </button>

        {/* Header */}
        <div className="px-6 pt-7 pb-4 text-center border-b border-border/30">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 font-[family-name:var(--font-display)]">
            Join Ralph
          </h1>
          <p className="text-secondary text-sm">
            Pop culture for the fun of it.
          </p>
        </div>

        {/* Tiers */}
        <div className="p-5 space-y-4">
          {/* Free tier */}
          <div className="bg-background/60 backdrop-blur border border-white/10 rounded-xl p-5">
            <h3 className="text-base font-bold text-ralph-teal mb-1">
              Free
            </h3>
            <p className="text-sm text-secondary mb-4">
              Magazine articles, events, shop, and the full Ralph experience.
            </p>
            <button
              onClick={handleFreeSignup}
              disabled={isLoading !== null}
              className="w-full flex items-center justify-center gap-3 rounded-full bg-ralph-teal py-2.5 text-white font-medium hover:bg-ralph-teal/90 transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" opacity="0.95" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity="0.75" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity="0.55" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity="0.85" />
              </svg>
              {isLoading === 'free' ? 'Signing in…' : 'Sign up with Google'}
            </button>
          </div>

          {/* Paid tier */}
          <div className="bg-background/60 backdrop-blur border border-ralph-pink/40 rounded-xl p-5 relative">
            <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-ralph-pink text-white">
              Paid
            </span>
            <h3 className="text-base font-bold text-ralph-pink mb-1 mt-1">
              £3 a month*
            </h3>
            <p className="text-sm text-secondary mb-4">
              Quarterly print mag + TV channel + everything in Free.
            </p>
            <button
              onClick={handlePaidSignup}
              disabled={isLoading !== null}
              className="w-full rounded-full bg-ralph-pink py-2.5 text-white font-medium hover:bg-ralph-pink/90 transition-colors disabled:opacity-50"
            >
              {isLoading === 'paid' ? 'Signing in…' : 'Sign up & upgrade'}
            </button>
            <p className="text-[10px] text-muted mt-3 leading-relaxed">
              * Paid quarterly, not monthly. Includes VAT &amp; postage. Shopify
              checkout arrives post-launch.
            </p>
          </div>

          <p className="text-[10px] text-muted text-center pt-1">
            By signing up, you agree to Ralph&apos;s Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
