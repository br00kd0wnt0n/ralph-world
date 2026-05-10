import type { Metadata } from 'next'
import JoinRalphClient from '@/components/join-ralph/JoinRalphClient'

export const metadata: Metadata = {
  title: 'Join Ralph',
  description: 'Join the Ralph community and get access to exclusive content.',
}

export default function JoinRalphPage() {
  return <JoinRalphClient />
}
