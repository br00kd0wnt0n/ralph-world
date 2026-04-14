import { getPublishedLabItems } from '@/lib/data/lab'
import { getSiteCopy } from '@/lib/data/site-copy'
import LabClient from '@/components/lab/LabClient'

export const revalidate = 60

export default async function LabPage() {
  const [items, copy] = await Promise.all([
    getPublishedLabItems(),
    getSiteCopy(),
  ])
  return <LabClient items={items} copy={copy} />
}
