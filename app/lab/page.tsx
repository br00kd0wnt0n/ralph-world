import { getPublishedLabItems } from '@/lib/data/lab'
import LabClient from '@/components/lab/LabClient'

export const revalidate = 3600

export default async function LabPage() {
  const items = await getPublishedLabItems()
  return <LabClient items={items} />
}
