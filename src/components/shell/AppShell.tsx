'use client'

import { usePathname } from 'next/navigation'
import IconRail from '@/components/shell/IconRail'
import StudioSidebar from '@/components/shell/StudioSidebar'
import StoreSidebar from '@/components/shell/StoreSidebar'
import { modeFromPathname } from '@/lib/app-mode'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const mode = modeFromPathname(pathname)

  return (
    <div className="flex min-h-screen bg-bg-white-0">
      <div className="sticky top-0 hidden h-screen shrink-0 self-start lg:flex">
        <IconRail />
      </div>

      {mode === 'store' ? <StoreSidebar /> : <StudioSidebar />}

      <div className="relative flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  )
}
