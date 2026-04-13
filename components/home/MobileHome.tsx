'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { mobileCardVariants } from '@/lib/animation/homepage'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { ModuleItem } from './PlanetSection'

interface MobileHomeProps {
  magazineItems: ModuleItem[]
  eventItems: ModuleItem[]
  labItems: ModuleItem[]
}

function MobileCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  const { ref, isVisible } = useScrollReveal(0.1)
  return (
    <motion.div
      ref={ref}
      variants={mobileCardVariants}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

export default function MobileHome({
  magazineItems,
  eventItems,
  labItems,
}: MobileHomeProps) {
  return (
    <div className="md:hidden flex flex-col gap-6 px-4 py-8">
      {/* TV Card */}
      <MobileCard>
        <div className="rounded-2xl bg-surface p-5">
          <h3 className="text-lg font-bold text-ralph-yellow mb-2">
            Wait, Ralph has a TV channel &mdash; what the f**k, bro?
          </h3>
          <div className="w-full aspect-video bg-black/50 rounded-lg mb-3 flex items-center justify-center text-muted text-sm">
            Player placeholder
          </div>
          <div className="flex gap-2">
            {['Show Info', 'Now', 'Next', 'Schedule'].map((btn) => (
              <button
                key={btn}
                className="flex-1 text-[10px] py-1.5 rounded-full border border-border text-secondary hover:text-primary transition-colors"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      </MobileCard>

      {/* Magazine Card */}
      <MobileCard delay={0.1}>
        <div className="rounded-2xl bg-ralph-orange p-5">
          <h3 className="text-lg font-bold text-white mb-3">Magazine</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {magazineItems.map((item) => (
              <div
                key={item.id}
                className="shrink-0 w-36 rounded-lg bg-white/20 overflow-hidden"
              >
                <div className="w-full h-24 bg-white/10 relative">
                  {item.badge && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-white text-ralph-orange text-[10px] font-bold rounded">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-white text-xs font-medium line-clamp-2">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/magazine"
            className="block text-center text-sm font-medium text-white bg-white/20 rounded-full py-2 mt-3 hover:bg-white/30 transition-colors"
          >
            Show me more
          </Link>
        </div>
      </MobileCard>

      {/* Shop Card */}
      <MobileCard delay={0.2}>
        <div className="rounded-2xl bg-ralph-green p-5">
          <h3 className="text-lg font-bold text-white mb-3">Shop</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-lg bg-white/20 h-32 flex items-center justify-center text-white/40 text-xs">
              Product
            </div>
            <div className="rounded-lg bg-white/20 h-32 flex items-center justify-center text-white/40 text-xs">
              Product
            </div>
          </div>
          <Link
            href="/shop"
            className="block text-center text-sm font-medium text-white bg-white/20 rounded-full py-2 hover:bg-white/30 transition-colors"
          >
            More f**king great stuff
          </Link>
        </div>
      </MobileCard>

      {/* Events Card */}
      <MobileCard delay={0.3}>
        <div className="rounded-2xl bg-ralph-teal p-5">
          <h3 className="text-lg font-bold text-white mb-3">Events</h3>
          {eventItems.map((item) => (
            <div key={item.id} className="rounded-lg bg-white/20 p-3 mb-3">
              <p className="text-white text-sm font-medium">{item.title}</p>
              {item.subtitle && (
                <p className="text-white/60 text-xs mt-1">{item.subtitle}</p>
              )}
            </div>
          ))}
          <Link
            href="/events"
            className="block text-center text-sm font-medium text-white bg-white/20 rounded-full py-2 hover:bg-white/30 transition-colors"
          >
            Show me more
          </Link>
        </div>
      </MobileCard>

      {/* Lab Card */}
      <MobileCard delay={0.4}>
        <div className="rounded-2xl bg-ralph-yellow p-5">
          <h3 className="text-lg font-bold text-black mb-3">Lab</h3>
          {labItems.map((item) => (
            <div key={item.id} className="rounded-lg bg-black/10 p-3 mb-3">
              <div className="flex items-center gap-2">
                <p className="text-black text-sm font-medium">{item.title}</p>
                {item.badge && (
                  <span className="px-1.5 py-0.5 bg-black text-ralph-yellow text-[10px] font-bold rounded">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
          <Link
            href="/lab"
            className="block text-center text-sm font-medium text-black bg-black/10 rounded-full py-2 hover:bg-black/20 transition-colors"
          >
            Show me more
          </Link>
        </div>
      </MobileCard>
    </div>
  )
}
