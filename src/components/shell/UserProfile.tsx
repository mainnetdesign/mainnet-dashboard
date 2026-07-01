'use client'

import { RiArrowDownSLine } from '@remixicon/react'
import { ADMIN_PSEUDONYM, pseudonymInitials } from '@/lib/insta2figma/pseudonym'

export default function UserProfile() {
  return (
    <div className="flex items-center gap-3 rounded-[10px] p-1.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-soft-200 text-label-md text-text-strong-950">
        {pseudonymInitials(ADMIN_PSEUDONYM)}
      </div>
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
