import type { ComponentType } from 'react'
import type { LabItem } from '@/lib/data/lab'

export type MachineState = 'idle' | 'lever-pulled' | 'spinning' | 'settled'

export interface RalphOMaticProps {
  items: LabItem[]
  state: MachineState
  onLeverPull: () => void
  onItemSelect: (itemId: string) => void
  settledItemId?: string | null
  machineIllustration?: ComponentType<{ state: MachineState }>
  conveyorIllustration?: ComponentType<{ state: MachineState }>
}
