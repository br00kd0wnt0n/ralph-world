'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { mobileCardVariants } from '@/lib/animation/homepage'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { ModuleItem } from './PlanetSection'
import type { SiteCopy } from '@/lib/data/site-copy'

interface MobileHomeProps {
  magazineItems: ModuleItem[]
  eventItems: ModuleItem[]
  labItems: ModuleItem[]
  copy?: Partial<SiteCopy>
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
  copy,
}: MobileHomeProps) {
  const tvHeading = copy?.tv_hero_heading ?? 'Ralph TV'
  const magDesc = copy?.magazine_description
  const eventsDesc = copy?.events_description
  const shopDesc = copy?.shop_description
  const labDesc = copy?.lab_description

  return (
    <div className="md:hidden flex flex-col gap-6 px-4 py-8">
      {/* TV Card */}
      <MobileCard>
        <Link
          href="/tv"
          className="block rounded-2xl bg-surface p-5 hover:bg-surface-hover transition-colors"
        >
          <h3 className="text-lg font-bold text-ralph-yellow mb-2">
            {tvHeading}
          </h3>
          <p className="text-secondary text-sm">
            {copy?.tv_hero_intro ??
              "Our little TV channel. Switch on, tune in, and see what we're playing."}
          </p>
        </Link>
      </MobileCard>

      {/* Magazine Card */}
      <MobileCard delay={0.1}>
        <div className="rounded-2xl bg-ralph-orange p-5">
          <h3 className="text-lg font-bold text-white mb-1">Magazine</h3>
          {magDesc && (
            <p className="text-white/80 text-xs mb-3 line-clamp-2">{magDesc}</p>
          )}
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
          <h3 className="text-lg font-bold text-white mb-1">Shop</h3>
          {shopDesc && (
            <p className="text-white/80 text-xs mb-3 line-clamp-2">{shopDesc}</p>
          )}
          <Link
            href="/shop"
            className="block text-center text-sm font-medium text-white bg-white/20 rounded-full py-2 hover:bg-white/30 transition-colors"
          >
            Show me more
          </Link>
        </div>
      </MobileCard>

      {/* Events Card */}
      <MobileCard delay={0.3}>
        <div className="rounded-2xl bg-ralph-teal p-5">
          <h3 className="text-lg font-bold text-white mb-1">Events</h3>
          {eventsDesc && (
            <p className="text-white/80 text-xs mb-3 line-clamp-2">
              {eventsDesc}
            </p>
          )}
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
          <h3 className="text-lg font-bold text-black mb-1">Lab</h3>
          {labDesc && (
            <p className="text-black/70 text-xs mb-3 line-clamp-2">{labDesc}</p>
          )}
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
