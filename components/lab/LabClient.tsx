'use client'

import { useCallback, useState } from 'react'
import LabHero from './LabHero'
import RalphOMatic from './RalphOMatic'
import LabGrid from './LabGrid'
import SubscribeModal from '@/components/layout/SubscribeModal'
import Footer from '@/components/layout/Footer'
import { SPIN_DURATION_MS } from '@/lib/animation/lab'
import type { LabItem } from '@/lib/data/lab'
import type { MachineState } from './RalphOMatic.types'

interface LabClientProps {
  items: LabItem[]
}

export default function LabClient({ items }: LabClientProps) {
  const [state, setState] = useState<MachineState>('idle')
  const [settledItemId, setSettledItemId] = useState<string | null>(null)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  const handleLeverPull = useCallback(() => {
    if (state === 'spinning') return

    setState('lever-pulled')
    setSettledItemId(null)

    // Transition to spinning
    setTimeout(() => setState('spinning'), 300)

    // Pick a random item after spin completes
    setTimeout(() => {
      if (items.length > 0) {
        const picked = items[Math.floor(Math.random() * items.length)]
        setSettledItemId(picked.id)
      }
      setState('settled')
    }, 300 + SPIN_DURATION_MS)
  }, [state, items])

  const handleItemSelect = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId)
      if (item?.externalUrl) {
        window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
      }
    },
    [items]
  )

  return (
    <>
      <LabHero />

      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <RalphOMatic
            items={items}
            state={state}
            onLeverPull={handleLeverPull}
            onItemSelect={handleItemSelect}
            settledItemId={settledItemId}
          />
        </div>
      </section>

      <LabGrid
        items={items}
        onSubscribe={() => setSubscribeOpen(true)}
      />

      <Footer variant="dark" />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </>
  )
}
