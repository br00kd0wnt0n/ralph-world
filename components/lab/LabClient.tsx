'use client'

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import RalphOMatic from './RalphOMatic'
import LabGrid from './LabGrid'
import SubscribeModal from '@/components/layout/SubscribeModal'
import { SPIN_DURATION_MS } from '@/lib/animation/lab'
import { sectionPageVariants } from '@/lib/animation/page-transitions'
import { isSafeUrl } from '@/lib/safe-url'
import type { LabItem } from '@/lib/data/lab'
import type { MachineState } from './RalphOMatic.types'
import type { SiteCopy } from '@/lib/data/site-copy'

interface LabClientProps {
  items: LabItem[]
  copy?: Partial<SiteCopy>
}

export default function LabClient({ items }: LabClientProps) {
  const [state, setState] = useState<MachineState>('idle')
  const [settledItemId, setSettledItemId] = useState<string | null>(null)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  // Only items with an external URL are valid candidates for the machine —
  // otherwise tapping the settled bell jar would do nothing.
  const machineItems = items.filter((i) => Boolean(i.externalUrl))

  const handleLeverPull = useCallback(() => {
    if (state === 'spinning') return
    if (machineItems.length === 0) return

    setState('lever-pulled')
    setSettledItemId(null)

    setTimeout(() => setState('spinning'), 300)

    setTimeout(() => {
      const picked =
        machineItems[Math.floor(Math.random() * machineItems.length)]
      setSettledItemId(picked.id)
      setState('settled')
    }, 300 + SPIN_DURATION_MS)
  }, [state, machineItems])

  const handleItemSelect = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId)
      if (item?.externalUrl && isSafeUrl(item.externalUrl)) {
        window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
      }
    },
    [items]
  )

  return (
    <motion.div
      variants={sectionPageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Planet + white bg layered with content */}
      <section className="relative">
        <div className="absolute inset-0 z-0">
          <div className="relative w-full" style={{ height: 270 }}>
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
              style={{
                backgroundImage: 'url(/imgs/planet_background_lab.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none"
              style={{
                backgroundImage: 'url(/imgs/planet_foreground_lab.svg)',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                minWidth: 1380,
                width: '100%',
              }}
              aria-hidden="true"
            />
          </div>
          <div
            className="absolute bg-white"
            style={{ top: 270, left: 0, right: 0, bottom: 0 }}
          />
        </div>

        {/* Content layer */}
        <div
          className="relative z-10 px-6 pb-8"
          style={{ paddingTop: 200 }}
        >
          <div className="max-w-6xl mx-auto">
            <RalphOMatic
              items={machineItems}
              state={state}
              onLeverPull={handleLeverPull}
              onItemSelect={handleItemSelect}
              settledItemId={settledItemId}
            />
          </div>
        </div>
      </section>

      <LabGrid
        items={items}
        onSubscribe={() => setSubscribeOpen(true)}
      />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </motion.div>
  )
}
