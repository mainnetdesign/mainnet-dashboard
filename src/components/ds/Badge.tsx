import { cn } from '@/utils/cn'
import { badgeStyles, type BadgeVariant } from '@/lib/design-system/tokens'

type BadgeProps = {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const styles = badgeStyles[variant]
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-label-xs',
        styles.bg,
        styles.text,
        className,
      )}
    >
      {children}
    </span>
  )
}
