// AlignUI StatusBadge v0.0.0

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '@/utils/cn'

export type StatusBadgeStatus = 'completed' | 'pending' | 'failed' | 'disabled'

const STATUS_COLORS: Record<StatusBadgeStatus, string> = {
  completed: 'text-success-base',
  pending: 'text-warning-base',
  failed: 'text-error-base',
  disabled: 'text-text-disabled-300',
}

const LIGHT_BG: Record<StatusBadgeStatus, string> = {
  completed: 'bg-success-base/10',
  pending: 'bg-warning-base/10',
  failed: 'bg-error-base/10',
  disabled: 'bg-bg-weak-50',
}

type StatusBadgeRootProps = React.HTMLAttributes<HTMLDivElement> & {
  status: StatusBadgeStatus
  variant?: 'stroke' | 'light'
  asChild?: boolean
}

const StatusBadgeRoot = React.forwardRef<HTMLDivElement, StatusBadgeRootProps>(
  ({ status, variant = 'stroke', asChild, className, ...rest }, forwardedRef) => {
    const Component = asChild ? Slot : 'div'
    return (
      <Component
        ref={forwardedRef}
        data-status={status}
        className={cn(
          'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-label-xs',
          variant === 'stroke'
            ? 'bg-bg-white-0 text-text-sub-600 ring-1 ring-inset ring-stroke-soft-200'
            : cn('text-text-sub-600', LIGHT_BG[status]),
          status === 'disabled' && 'text-text-disabled-300',
          className,
        )}
        {...rest}
      />
    )
  },
)
StatusBadgeRoot.displayName = 'StatusBadgeRoot'

function StatusBadgeDot({ status, className }: { status: StatusBadgeStatus; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-4 items-center justify-center',
        STATUS_COLORS[status],
        className,
      )}
      aria-hidden
    >
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  )
}

function StatusBadgeIcon({
  as,
  status,
  className,
}: {
  as: React.ComponentType<{ className?: string }>
  status: StatusBadgeStatus
  className?: string
}) {
  const Component = as
  return <Component className={cn('size-4 shrink-0', STATUS_COLORS[status], className)} />
}

export { StatusBadgeRoot as Root, StatusBadgeDot as Dot, StatusBadgeIcon as Icon }
