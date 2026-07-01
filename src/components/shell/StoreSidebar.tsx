'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  RiApps2Line,
  RiArrowDownSLine,
  RiBarChartLine,
  RiCashLine,
  RiDashboard3Line,
  RiGroupLine,
  RiMoonLine,
  RiPaletteLine,
  RiSunLine,
} from '@remixicon/react'
import { useTheme } from 'next-themes'
import SidebarSection from '@/components/shell/SidebarSection'
import SidebarNavItem from '@/components/shell/SidebarNavItem'
import UserProfile from '@/components/shell/UserProfile'
import IconRail from '@/components/shell/IconRail'
import { I2F_BASE } from '@/lib/insta2figma/constants'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="size-8" />

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className="flex size-8 items-center justify-center rounded-lg border border-stroke-soft-200 text-text-soft-400 transition-colors hover:border-stroke-sub-300 hover:text-text-strong-950"
    >
      {isDark ? <RiSunLine className="size-4" /> : <RiMoonLine className="size-4" />}
    </button>
  )
}

function StoreHubHeader() {
  return (
    <div className="flex items-center justify-between border-b border-stroke-soft-200 px-3.5 pb-3.5 pt-5">
      <div className="flex min-w-0 items-center gap-2 pl-1.5">
        <div className="flex size-[27px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]">
          <span className="text-[10px] font-bold text-white">S</span>
        </div>
        <p className="truncate text-label-lg tracking-tight text-text-strong-950">Mainnet Store</p>
      </div>
      <ThemeToggle />
    </div>
  )
}

function Insta2FigmaHeader() {
  return (
    <div className="border-b border-stroke-soft-200 px-3.5 pb-3.5 pt-5">
      <div className="flex items-center justify-between pl-1.5">
        <Link href={I2F_BASE} className="flex min-w-0 items-center gap-2">
          <div className="flex size-[27px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]">
            <span className="text-[10px] font-bold text-white">I2F</span>
          </div>
          <p className="truncate text-label-lg tracking-tight text-text-strong-950">Insta2Figma</p>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/store"
            className="flex items-center justify-center rounded-lg p-1.5 text-text-soft-400 hover:bg-bg-weak-50 hover:text-text-strong-950"
            title="Voltar para Serviços"
          >
            <RiArrowDownSLine className="size-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function StoreHubNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      <SidebarSection title="Loja">
        <SidebarNavItem
          href="/store"
          label="Serviços"
          active={pathname === '/store'}
          onNavigate={onNavigate}
          icon={<RiApps2Line className="size-5" />}
        />
      </SidebarSection>
      <SidebarSection title="Desenvolvimento" className="border-b-0">
        <SidebarNavItem
          href="/store/design-system"
          label="Sistema de design"
          active={pathname.startsWith('/store/design-system')}
          onNavigate={onNavigate}
          icon={<RiPaletteLine className="size-5" />}
        />
      </SidebarSection>
    </>
  )
}

function Insta2FigmaNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      <SidebarSection title="Principal">
        <SidebarNavItem
          href={`${I2F_BASE}/overview`}
          label="Visão geral"
          active={pathname.startsWith(`${I2F_BASE}/overview`)}
          onNavigate={onNavigate}
          icon={<RiDashboard3Line className="size-5" />}
        />
        <SidebarNavItem
          href={`${I2F_BASE}/users`}
          label="Usuários"
          active={pathname.startsWith(`${I2F_BASE}/users`)}
          onNavigate={onNavigate}
          icon={<RiGroupLine className="size-5" />}
        />
      </SidebarSection>
      <SidebarSection title="Análises" className="border-b-0">
        <SidebarNavItem
          href={`${I2F_BASE}/earnings`}
          label="Receitas"
          active={pathname.startsWith(`${I2F_BASE}/earnings`)}
          onNavigate={onNavigate}
          icon={<RiCashLine className="size-5" />}
        />
        <SidebarNavItem
          href={`${I2F_BASE}/analytics`}
          label="Métricas"
          active={pathname.startsWith(`${I2F_BASE}/analytics`)}
          onNavigate={onNavigate}
          icon={<RiBarChartLine className="size-5" />}
        />
      </SidebarSection>
    </>
  )
}

export default function StoreSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const inProduct = pathname.startsWith('/store/insta2figma')

  const sidebarBody = (
    <>
      {inProduct ? <Insta2FigmaHeader /> : <StoreHubHeader />}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {inProduct ? (
          <Insta2FigmaNav onNavigate={() => setMobileOpen(false)} />
        ) : (
          <StoreHubNav onNavigate={() => setMobileOpen(false)} />
        )}
      </div>
      <div className="border-t border-stroke-soft-200 px-3.5 pb-3.5 pt-5">
        <UserProfile />
      </div>
    </>
  )

  return (
    <>
      <aside className="relative hidden h-screen w-[272px] shrink-0 flex-col border-r border-stroke-soft-200 bg-bg-white-0 lg:flex">
        {sidebarBody}
        <span className="pointer-events-none absolute -left-px top-[63px] z-10 size-1.5 -translate-x-1/2 border border-stroke-soft-200 bg-bg-white-0" />
      </aside>

      <div className="fixed left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-3 lg:hidden">
        <Link href={inProduct ? `${I2F_BASE}/overview` : '/store'} className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]">
            <span className="text-[8px] font-bold text-white">{inProduct ? 'I2F' : 'S'}</span>
          </div>
          <span className="text-label-sm text-text-strong-950">
            {inProduct ? 'Insta2Figma' : 'Mainnet Store'}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <IconRail compact onModeChange={() => setMobileOpen(false)} />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-1.5 hover:bg-bg-weak-50"
            aria-label="Menu"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-10 flex lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="relative flex w-[272px] max-w-[85vw] flex-col border-r border-stroke-soft-200 bg-bg-white-0 pt-14 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  )
}
