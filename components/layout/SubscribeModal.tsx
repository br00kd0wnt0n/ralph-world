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
    // Paid flow: sign in first, then checkout will be handled post-launch
    // via Shopify Subscriptions. For now, same-sign-in — webhook upgrades tier
    // when user actually pays.
    signIn('google', { callbackUrl: '/account?upgrade=paid' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      {/* Background */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute bottom-0 left-0 right-0 h-[40vh]">
          <svg
            viewBox="0 0 1440 400"
            className="absolute bottom-0 w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0,400 L0,200 Q720,0 1440,200 L1440,400 Z"
              fill="none"
              stroke="#FF2098"
              strokeWidth="2"
            />
            <path
              d="M0,400 L0,220 Q720,20 1440,220 L1440,400 Z"
              fill="white"
              fillOpacity="0.05"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col w-full overflow-y-auto">
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl transition-colors"
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
            {/* Left */}
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                JOIN<br />RALPH
              </h1>
              <div className="flex gap-3 mt-4">
                <div className="w-24 h-32 bg-ralph-pink/20 rounded" />
                <div className="w-24 h-32 bg-ralph-orange/20 rounded" />
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-8">
              {/* Free tier */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-ralph-teal mb-2">
                  Experience pop culture for the fun of it.
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  Get access to our magazine articles, events listings, and the
                  full Ralph experience. Absolutely free.
                </p>
                <button
                  onClick={handleFreeSignup}
                  disabled={isLoading !== null}
                  className="w-full flex items-center justify-center gap-3 rounded-full bg-ralph-teal py-3 text-white font-medium hover:bg-ralph-teal/90 transition-colors disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" opacity="0.9" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity="0.7" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity="0.5" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity="0.8" />
                  </svg>
                  {isLoading === 'free' ? 'Signing in…' : 'Sign up with Google'}
                </button>
                <p className="text-[10px] text-white/40 mt-3 text-center">
                  By signing up, you agree to Ralph&apos;s Terms and Privacy Policy
                </p>
              </div>

              {/* Paid tier */}
              <div className="bg-white/5 backdrop-blur border border-ralph-pink/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-ralph-pink mb-2">
                  Prefer your culture more hands-on?
                </h3>
                <p className="text-2xl font-bold text-white mb-1">
                  &pound;3 a month*
                </p>
                <p className="text-sm text-white/70 mb-4">
                  Quarterly mag + TV channel + everything else
                </p>
                <button
                  onClick={handlePaidSignup}
                  disabled={isLoading !== null}
                  className="w-full rounded-full bg-ralph-pink py-3 text-white font-medium hover:bg-ralph-pink/90 transition-colors disabled:opacity-50"
                >
                  {isLoading === 'paid' ? 'Signing in…' : 'Sign up &amp; upgrade'}
                </button>
                <p className="text-[10px] text-white/40 mt-3">
                  * Payment taken once per quarter &mdash; not monthly. Includes
                  VAT and postage. Shopify checkout arrives post-launch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
