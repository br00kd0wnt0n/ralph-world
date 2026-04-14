'use client'

import TVStatic from './TVStatic'

interface SubscribeGateProps {
  onSubscribe: () => void
  heading?: string
  body?: string
}

export default function SubscribeGate({
  onSubscribe,
  heading = 'Subscribe to keep watching',
  body = "Ralph.world is just bursting with Pop Culture for the Fun of It™ and experiencing it couldn't be easier.",
}: SubscribeGateProps) {
  return (
    <div className="absolute inset-0 bg-black">
      <TVStatic />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-ralph-purple/90 backdrop-blur rounded-2xl p-6 max-w-sm shadow-2xl border border-ralph-pink/30">
          <h3 className="text-white text-xl font-bold mb-3">
            {heading}
          </h3>
          <p className="text-white/80 text-sm mb-3 leading-relaxed">
            {body}
          </p>
          <p className="text-white/70 text-xs mb-5 leading-relaxed">
            Simply press the link below and sign up by providing your email
            address. Cheap at half the price, right?
          </p>
          <button
            onClick={onSubscribe}
            className="w-full rounded-full bg-ralph-pink py-3 text-white font-medium hover:bg-ralph-pink/90 transition-colors"
          >
            Subscribe now
          </button>
        </div>
      </div>
    </div>
  )
}
