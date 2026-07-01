import { cn } from '@/utils/cn'

type WidgetCardProps = {
  children: React.ReactNode
  className?: string
  padding?: 'default' | 'none'
}

export default function WidgetCard({ children, className, padding = 'default' }: WidgetCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)]',
        padding === 'default' && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}
