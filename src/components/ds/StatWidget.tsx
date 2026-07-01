'use client'

import WidgetCard from '@/components/ds/WidgetCard'
import Sparkline from '@/components/ds/Sparkline'
import Badge from '@/components/ds/Badge'
import { cn } from '@/utils/cn'
import type { BadgeVariant } from '@/lib/design-system/tokens'

type StatWidgetProps = {
  label: string
  value: React.ReactNode
  delta?: string
  deltaVariant?: BadgeVariant
  icon?: React.ReactNode
  sparklineData?: number[]
  sparklinePosition?: 'top' | 'bottom'
  className?: string
}

export default function StatWidget({
  label,
  value,
  delta,
  deltaVariant = 'success',
  icon,
  sparklineData,
  sparklinePosition = 'bottom',
  className,
}: StatWidgetProps) {
  const sparkline = sparklineData && sparklineData.length > 1 && (
    <Sparkline data={sparklineData} height={sparklinePosition === 'top' ? 40 : 64} />
  )

  return (
    <WidgetCard className={cn('flex flex-col gap-5', className)}>
      {sparklinePosition === 'top' && sparkline}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-paragraph-sm text-text-sub-600">{label}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-title-h5 text-text-strong-950">{value}</p>
            {delta && <Badge variant={deltaVariant}>{delta}</Badge>}
          </div>
        </div>
        {icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)]">
            {icon}
          </div>
        )}
      </div>

      {sparklinePosition === 'bottom' && sparkline}
    </WidgetCard>
  )
}
