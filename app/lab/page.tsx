import type { Metadata } from 'next'
import { getPublishedLabItems } from '@/lib/data/lab'
import { getSiteCopy } from '@/lib/data/site-copy'
import LabClient from '@/components/lab/LabClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Lab',
  description:
    'Experiments, tools, generators and oddities from the Ralph lab.',
  alternates: { canonical: '/lab' },
  openGraph: {
    title: 'Ralph Lab',
    description:
      'Experiments, tools, and oddities from the Ralph lab.',
    url: '/lab',
  },
}

export default async function LabPage() {
  const [items, copy] = await Promise.all([
    getPublishedLabItems(),
    getSiteCopy(),
  ])
  return <LabClient items={items} copy={copy} />
}
