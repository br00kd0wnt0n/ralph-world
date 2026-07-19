'use client'

import { useRouter } from 'next/navigation'
import TVStatic from './TVStatic'

interface SubscribeGateProps {
  onSubscribe: () => void
  heading?: string
  body?: string
}

export default function SubscribeGate({
  onSubscribe,
  heading = "That's your lot for now",
  body = "Create a free account to keep watching, or go paid for the full Ralph experience — magazine, TV, events and more.",
}: SubscribeGateProps) {
  const router = useRouter()

  return (
    <div className="absolute inset-0 bg-black">
      <TVStatic />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-ralph-purple/90 backdrop-blur rounded-2xl p-6 max-w-sm shadow-2xl border border-ralph-pink/30">
          <h3 className="text-white text-xl font-bold mb-3">
            {heading}
          </h3>
          <p className="text-white/80 text-sm mb-5 leading-relaxed">
            {body}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/login?mode=signup')}
              className="w-full rounded-full bg-white text-ralph-purple py-3 text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Sign up free
            </button>
            <button
              onClick={onSubscribe}
              className="w-full rounded-full bg-ralph-pink py-3 text-black text-sm font-medium hover:bg-ralph-pink/90 transition-colors"
            >
              Get magazine — £3/mo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
