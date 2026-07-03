import Badge from '@/components/ds/Badge'
import { importScrapeSourceLabel } from '@/lib/insta2figma/import-source'
import type { ImportScrapeSource } from '@/types/insta2figma'

export default function ScrapeSourceBadge({ source }: { source: ImportScrapeSource }) {
  if (source === 'unknown') {
    return <span className="text-paragraph-sm text-text-soft-400">—</span>
  }

  return (
    <Badge variant={source === 'worker' ? 'info' : 'neutral'}>
      {importScrapeSourceLabel(source)}
    </Badge>
  )
}
