'use client'

import { RiLoader4Line, RiPrinterLine, RiRefreshLine } from '@remixicon/react'
import * as Button from '@/components/ui/button'

type StudioPageActionsProps = {
  onRefresh?: () => void
  onPrint?: () => void
  loading?: boolean
  refreshTitle?: string
}

export default function StudioPageActions({
  onRefresh,
  onPrint,
  loading = false,
  refreshTitle = 'Atualizar dados',
}: StudioPageActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onRefresh && (
        <Button.Root
          variant="neutral"
          mode="stroke"
          size="small"
          onClick={onRefresh}
          disabled={loading}
          title={refreshTitle}
        >
          <Button.Icon as={loading ? RiLoader4Line : RiRefreshLine} className={loading ? 'animate-spin' : undefined} />
          Atualizar
        </Button.Root>
      )}
      {onPrint && (
        <Button.Root
          variant="neutral"
          mode="stroke"
          size="small"
          onClick={onPrint}
          disabled={loading}
          title="Exportar PDF"
        >
          <Button.Icon as={RiPrinterLine} />
          PDF
        </Button.Root>
      )}
    </div>
  )
}
