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
    <div className="fixed inset-0 z-50 bg-[#0F0420] overflow-y-auto">
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-5 right-6 text-white/70 hover:text-white text-2xl transition-colors z-20"
        aria-label="Close"
      >
        &#10005;
      </button>

      {/* Top dark section with characters on the arch */}
      <div className="relative h-[220px] md:h-[280px] overflow-hidden">
        {/* Character placeholders sitting on the arch */}
        <div className="absolute left-[5%] bottom-4 w-20 h-14 bg-white/5 border border-white/20 rounded flex items-center justify-center text-[8px] text-white/40">
          satellite
        </div>
        <div className="absolute left-[25%] bottom-8 w-12 h-20 bg-white/5 border border-white/20 rounded flex items-center justify-center text-[8px] text-white/40">
          alien
        </div>
        <div className="absolute left-[42%] bottom-6 w-20 h-24 bg-white/5 border border-white/20 rounded flex items-center justify-center text-[8px] text-white/40">
          ralph-flag
        </div>
        <div className="absolute right-[22%] bottom-6 w-14 h-20 bg-white/5 border border-white/20 rounded flex items-center justify-center text-[8px] text-white/40">
          char
        </div>
        <div className="absolute right-[5%] bottom-4 w-20 h-12 bg-white/5 border border-white/20 rounded flex items-center justify-center text-[8px] text-white/40">
          ufo
        </div>

        {/* Pink arch at the bottom of the dark section */}
        <svg
          viewBox="0 0 1440 120"
          className="absolute bottom-0 left-0 right-0 w-full"
          preserveAspectRatio="none"
          style={{ height: '100px' }}
        >
          <path
            d="M0,120 L0,80 Q720,-20 1440,80 L1440,120 Z"
            fill="#0F0420"
            stroke="#FF2098"
            strokeWidth="4"
          />
        </svg>
      </div>

      {/* White content area below the arch */}
      <div className="bg-white min-h-[calc(100vh-220px)] md:min-h-[calc(100vh-280px)] px-6 pb-20 relative">
        {/* London globe placeholder bottom-left */}
        <div className="absolute bottom-6 left-6 w-14 h-14 border border-black rounded-full flex items-center justify-center text-[8px] text-gray-500 bg-white">
          london
        </div>

        <div className="max-w-5xl mx-auto pt-10 md:pt-14 grid md:grid-cols-[1fr_1fr] gap-8 md:gap-16 items-start">
          {/* Left: JOIN RALPH + magazine covers */}
          <div className="relative">
            {/* Magazine cover placeholder (left of title) */}
            <div className="absolute -left-2 top-32 hidden md:block pointer-events-none">
              <div className="w-36 h-52 bg-ralph-yellow/40 border border-black rounded flex items-center justify-center text-[10px] text-gray-500 -rotate-6">
                mag cover
              </div>
            </div>

            <h1
              className="relative text-6xl md:text-[7rem] font-bold text-black mb-4 z-10 font-[family-name:var(--font-display)] leading-[0.9]"
              style={{ transform: 'rotate(-3deg)' }}
            >
              JOIN<br />RALPH
            </h1>

            {/* Astronaut/character placeholder */}
            <div className="relative z-10 w-28 h-36 bg-black/5 border border-black/30 rounded flex items-center justify-center text-[10px] text-gray-500 mt-6 ml-auto">
              astronaut
            </div>
          </div>

          {/* Right: tiers */}
          <div className="flex flex-col gap-8 relative pt-4">
            {/* Magazine cover placeholder (right of tiers) */}
            <div className="absolute -right-6 top-2 hidden md:block pointer-events-none">
              <div className="w-28 h-40 bg-ralph-pink/40 border border-black rounded flex items-center justify-center text-[10px] text-gray-500 rotate-6">
                mag cover
              </div>
            </div>

            {/* Free tier */}
            <div className="relative z-10 max-w-md">
              <h3 className="text-lg md:text-xl font-bold text-black mb-2">
                Experience pop culture for the fun of it.
              </h3>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                For the princely sum of just your email address, you can enjoy
                access to all our editorial content, buy tickets to one of our
                amazing IRL events and much more. Sounds good, right? Then
                what&apos;s stopping you?
              </p>
              <button
                onClick={handleFreeSignup}
                disabled={isLoading !== null}
                className="border border-black rounded-md px-5 py-2 text-black font-medium text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                {isLoading === 'free' ? 'Signing in…' : 'Hook me up for free'}
              </button>
            </div>

            {/* Paid tier */}
            <div className="relative z-10 max-w-md">
              <h3 className="text-lg md:text-xl font-bold text-black mb-2">
                Prefer your culture more hands-on?
              </h3>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                Then you need a bit of The Ralph&trade; in your life. For the
                equivalent of just £3 a month* you&apos;ll get our quarterly
                fun, glossy mag straight through your letterbox. On top of
                that, we&apos;ll switch on our TV channel for you, plus
                everything else Ralph World has to offer.
              </p>
              <button
                onClick={handlePaidSignup}
                disabled={isLoading !== null}
                className="border border-black rounded-md px-5 py-2 text-black font-medium text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                {isLoading === 'paid' ? 'Signing in…' : 'Join for £3 per month'}
              </button>
            </div>
          </div>
        </div>

        {/* Fine print */}
        <p className="max-w-5xl mx-auto text-xs text-gray-500 mt-12 md:pl-[55%]">
          * Payment is taken once per quarter &mdash; not monthly. Includes VAT and postage.
        </p>
      </div>
    </div>
  )
}
