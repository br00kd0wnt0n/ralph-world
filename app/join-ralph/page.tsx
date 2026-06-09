import type { Metadata } from 'next'
import { Suspense } from 'react'
import JoinRalphClient from '@/components/join-ralph/JoinRalphClient'

export const metadata: Metadata = {
  title: 'Join Ralph',
  description: 'Join the Ralph community and get access to exclusive content.',
}

export default function JoinRalphPage() {
  return (
    <Suspense>
      <JoinRalphClient />
    </Suspense>
  )
}
