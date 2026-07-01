'use client'

import Link from 'next/link'
import { cn } from '@/utils/cn'

type SidebarNavItemProps = {
  href: string
  label: string
  icon: React.ReactNode
  active?: boolean
  onNavigate?: () => void
}

export default function SidebarNavItem({
  href,
  label,
  icon,
  active = false,
  onNavigate,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 text-label-sm transition-colors',
        active
          ? 'bg-bg-weak-50 text-text-strong-950'
          : 'text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-text-strong-950' : 'text-text-sub-600')}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}
