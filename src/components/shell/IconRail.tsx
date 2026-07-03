'use client'

import { usePathname, useRouter } from 'next/navigation'
import { RiBuildingLine, RiStore2Line } from '@remixicon/react'
import MainnetMark from '@/components/MainnetMark'
import UserProfile from '@/components/shell/UserProfile'
import { cn } from '@/utils/cn'
import { homeForMode, modeFromPathname, type AppMode } from '@/lib/app-mode'

type IconRailProps = {
  compact?: boolean
  onModeChange?: () => void
}

function ModeButton({
  mode,
  active,
  icon,
  label,
  onClick,
  compact = false,
}: {
  mode: AppMode
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: (mode: AppMode) => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(mode)}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center justify-center transition-colors',
        compact
          ? 'rounded-md px-2 py-1.5'
          : 'w-full px-2.5 py-[18px]',
        active
          ? 'bg-bg-weak-50 text-text-strong-950'
          : 'text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
      )}
    >
      {icon}
    </button>
  )
}

export default function IconRail({ compact = false, onModeChange }: IconRailProps) {
  const pathname = usePathname()
  const router = useRouter()
  const mode = modeFromPathname(pathname)

  function switchMode(next: AppMode) {
    if (next === mode) return
    router.push(homeForMode(next))
    onModeChange?.()
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-stroke-soft-200 p-1">
        <ModeButton
          mode="studio"
          active={mode === 'studio'}
          label="Estúdio"
          icon={<RiBuildingLine className="size-5" />}
          onClick={switchMode}
          compact
        />
        <ModeButton
          mode="store"
          active={mode === 'store'}
          label="Loja"
          icon={<RiStore2Line className="size-5" />}
          onClick={switchMode}
          compact
        />
        <UserProfile iconOnly />
      </div>
    )
  }

  return (
    <aside className="relative flex h-full w-[83px] shrink-0 flex-col border-r border-stroke-soft-200 bg-bg-white-0">
      <div className="flex h-[66px] flex-col items-center justify-end px-3.5 pb-3.5 pt-5">
        <MainnetMark className="h-[18px] w-[25px] text-text-strong-950" />
      </div>

      <div className="border-y border-stroke-soft-200">
        <ModeButton
          mode="studio"
          active={mode === 'studio'}
          label="Estúdio"
          icon={<RiBuildingLine className="size-5" />}
          onClick={switchMode}
        />
      </div>

      <ModeButton
        mode="store"
        active={mode === 'store'}
        label="Loja"
        icon={<RiStore2Line className="size-5" />}
        onClick={switchMode}
      />

      <div className="flex flex-1" />

      <div className="flex justify-center px-3.5 pb-4 pt-2">
        <UserProfile iconOnly />
      </div>

      <span className="pointer-events-none absolute left-full top-[63px] z-10 size-1.5 -translate-x-1/2 border border-stroke-soft-200 bg-bg-white-0" />
    </aside>
  )
}
