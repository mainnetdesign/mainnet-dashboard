import { cn } from '@/utils/cn'

type AvatarProps = {
  src?: string
  alt?: string
  initials?: string
  size?: 24 | 32 | 40
  className?: string
}

const sizeMap = {
  24: 'size-6 text-label-xs',
  32: 'size-8 text-label-sm',
  40: 'size-10 text-label-md',
}

export default function Avatar({ src, alt, initials, size = 32, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className={cn('shrink-0 rounded-full object-cover', sizeMap[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-bg-soft-200 font-medium text-text-strong-950',
        sizeMap[size],
        className,
      )}
    >
      {initials}
    </div>
  )
}
