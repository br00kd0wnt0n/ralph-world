'use client'

import { useCallback, useState } from 'react'
import LabHero from './LabHero'
import RalphOMatic from './RalphOMatic'
import LabGrid from './LabGrid'
import SubscribeModal from '@/components/layout/SubscribeModal'
import Footer from '@/components/layout/Footer'
import { SPIN_DURATION_MS } from '@/lib/animation/lab'
import { isSafeUrl } from '@/lib/safe-url'
import type { LabItem } from '@/lib/data/lab'
import type { MachineState } from './RalphOMatic.types'
import type { SiteCopy } from '@/lib/data/site-copy'

interface LabClientProps {
  items: LabItem[]
  copy?: Partial<SiteCopy>
}

export default function LabClient({ items, copy }: LabClientProps) {
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
    <>
      <LabHero
        heading={copy?.lab_hero_heading}
        intro={copy?.lab_hero_intro}
        cta={copy?.lab_hero_cta}
        themeKey={copy?.lab_hero_theme}
      />

      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <RalphOMatic
            items={machineItems}
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

      <Footer variant="dark" copy={copy} />

      <SubscribeModal
        isOpen={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </>
  )
}
