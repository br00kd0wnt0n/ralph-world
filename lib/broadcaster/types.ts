export interface RelayStatus {
  streaming: boolean
  available: boolean
}

export interface ScheduleItem {
  startTime: string
  endTime: string
  showName: string
  description?: string
}

export interface BroadcasterAsset {
  id: string
  title: string
  duration: number
  thumbnailUrl?: string
}

export interface LiveState {
  status: 'live' | 'offline' | 'loading'
  current?: ScheduleItem
  next?: ScheduleItem
}
