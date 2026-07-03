'use client'

import { RiArrowDownSLine } from '@remixicon/react'
import { Avatar } from '@/components/ds'
import { ADMIN_PSEUDONYM, pseudonymColor } from '@/lib/insta2figma/pseudonym'
import { cn } from '@/utils/cn'

const ADMIN_COLOR = pseudonymColor('mainnet-admin-marcus')

type UserProfileProps = {
  iconOnly?: boolean
  className?: string
}

export default function UserProfile({ iconOnly = false, className }: UserProfileProps) {
  const avatar = <Avatar colorKey={ADMIN_COLOR} size={40} className={iconOnly ? 'size-9' : undefined} />


  if (iconOnly) {
    return (
      <button
        type="button"
        title={ADMIN_PSEUDONYM}
        aria-label={`Perfil: ${ADMIN_PSEUDONYM}`}
        className={cn('rounded-full transition-opacity hover:opacity-80', className)}
      >
        {avatar}
      </button>
    )
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-[10px] p-1.5', className)}>
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate text-label-sm text-text-strong-950">{ADMIN_PSEUDONYM}</p>
        <p className="truncate text-label-xs text-text-soft-400">Administrador</p>
      </div>
      <button
        type="button"
        className="flex shrink-0 items-center justify-center rounded-md p-0.5 text-text-soft-400 hover:text-text-strong-950"
        aria-label="Menu do perfil"
      >
        <RiArrowDownSLine className="size-[18px]" />
      </button>
    </div>
  )
}
