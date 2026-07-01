import Badge from '@/components/ds/Badge'
import { cn } from '@/utils/cn'
import type { BadgeVariant } from '@/lib/design-system/tokens'

type MetricHeaderProps = {
  label: string
  value: React.ReactNode
  delta?: string
  deltaVariant?: BadgeVariant
  suffix?: string
  className?: string
}

export default function MetricHeader({
  label,
  value,
  delta,
  deltaVariant = 'success',
  suffix,
  className,
}: MetricHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <p className="text-paragraph-sm text-text-sub-600">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display text-title-h5 text-text-strong-950">{value}</p>
        {delta && <Badge variant={deltaVariant}>{delta}</Badge>}
        {suffix && <span className="text-label-xs text-text-sub-600">{suffix}</span>}
      </div>
    </div>
  )
}
