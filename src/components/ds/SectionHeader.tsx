import { cn } from '@/utils/cn'

type SectionHeaderProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export default function SectionHeader({
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-1 py-4', className)}>
      <div>
        <h2 className="text-label-lg text-text-strong-950">{title}</h2>
        {description && (
          <p className="mt-0.5 text-paragraph-sm text-text-sub-600">{description}</p>
        )}
      </div>
      {actions}
    </div>
  )
}
