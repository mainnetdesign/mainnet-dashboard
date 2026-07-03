import { RiUser3Fill } from '@remixicon/react'
import type { AvatarColorKey } from '@/lib/insta2figma/pseudonym'
import { cn } from '@/utils/cn'

type AvatarProps = {
  src?: string
  alt?: string
  initials?: string
  /** Quando definido, renderiza a silhueta de pessoa colorida (pseudônimo anônimo) */
  colorKey?: AvatarColorKey
  size?: 24 | 32 | 40
  className?: string
}

const sizeMap = {
  24: 'size-6 text-label-xs',
  32: 'size-8 text-label-sm',
  40: 'size-10 text-label-md',
}

const iconSizeMap = {
  24: 'size-4',
  32: 'size-[18px]',
  40: 'size-6',
}

const colorMap: Record<AvatarColorKey, string> = {
  purple: 'bg-purple-100 text-purple-600',
  sky: 'bg-sky-100 text-sky-600',
  pink: 'bg-pink-100 text-pink-600',
  teal: 'bg-teal-100 text-teal-600',
}

export default function Avatar({ src, alt, initials, colorKey, size = 32, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className={cn('shrink-0 rounded-full object-cover', sizeMap[size], className)}
      />
    )
  }

  if (colorKey) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          sizeMap[size],
          colorMap[colorKey],
          className,
        )}
      >
        <RiUser3Fill className={iconSizeMap[size]} aria-hidden />
      </div>
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
