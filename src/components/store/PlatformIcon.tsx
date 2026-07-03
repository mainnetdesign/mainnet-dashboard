import { DataTableIconCell, DataTableTextCell } from '@/components/ds'
import { platformLabel } from '@/lib/insta2figma/labels'
import { cn } from '@/utils/cn'

type PlatformIconProps = {
  platform: string | null
  className?: string
}

export function FigmaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 36" className={cn('size-4', className)} aria-hidden>
      <path
        fill="#F24E1E"
        d="M12 18c0-3.314 2.686-6 6-6h6v6c0 3.314-2.686 6-6 6s-6-2.686-6-6z"
      />
      <path
        fill="#FF7262"
        d="M0 6C0 2.686 2.686 0 6 0h6v12H6C2.686 12 0 9.314 0 6z"
      />
      <path fill="#A259FF" d="M0 18c0-3.314 2.686-6 6-6h6v12H6c-3.314 0-6-2.686-6-6z" />
      <path fill="#1ABCFE" d="M0 30c0-3.314 2.686-6 6-6h6v6c0 3.314-2.686 6-6 6H6c-3.314 0-6-2.686-6-6z" />
      <path fill="#0ACF83" d="M12 0c3.314 0 6 2.686 6 6s-2.686 6-6 6h-6V0z" />
    </svg>
  )
}

export function FramerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4', className)} aria-hidden>
      <path
        fill="currentColor"
        d="M4 0h16v8h-8L4 0zm0 8h8l8 8H4V8zm0 16V16h16v8H4z"
      />
    </svg>
  )
}

export default function PlatformIcon({ platform, className }: PlatformIconProps) {
  if (platform === 'figma') return <FigmaIcon className={className} />
  if (platform === 'framer') return <FramerIcon className={cn('text-text-strong-950', className)} />
  return null
}

export function PlatformTableCell({ platform }: { platform: string | null }) {
  if (!platform) return <DataTableTextCell>—</DataTableTextCell>

  return (
    <DataTableIconCell
      icon={<PlatformIcon platform={platform} />}
      label={platformLabel(platform)}
    />
  )
}
