'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  RiBarChartLine,
  RiBankCardLine,
  RiCashLine,
  RiDashboard3Line,
  RiFileTextLine,
  RiGroupLine,
  RiMoonLine,
  RiSunLine,
} from '@remixicon/react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import SidebarSection from '@/components/shell/SidebarSection'
import SidebarNavItem from '@/components/shell/SidebarNavItem'
import IconRail from '@/components/shell/IconRail'

const NAV = {
  principal: [
    { href: '/dashboard', label: 'Dashboard', icon: RiDashboard3Line },
  ],
  financeiro: [
    { href: '/fluxo', label: 'Fluxo de Caixa', icon: RiCashLine },
    { href: '/financeiro', label: 'Financeiro', icon: RiBankCardLine },
    { href: '/relatorio', label: 'Relatório', icon: RiFileTextLine },
  ],
  operacoes: [
    { href: '/colaboradores', label: 'Colaboradores', icon: RiGroupLine },
    { href: '/auditoria', label: 'Auditoria', icon: RiBarChartLine },
  ],
}

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

function StudioNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      <SidebarSection title="Principal">
        {NAV.principal.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            active={pathname.startsWith(item.href)}
            onNavigate={onNavigate}
            icon={<item.icon className="size-5" />}
          />
        ))}
      </SidebarSection>
      <SidebarSection title="Financeiro">
        {NAV.financeiro.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            active={pathname.startsWith(item.href)}
            onNavigate={onNavigate}
            icon={<item.icon className="size-5" />}
          />
        ))}
      </SidebarSection>
      <SidebarSection title="Operações" className="border-b-0">
        {NAV.operacoes.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            active={pathname.startsWith(item.href)}
            onNavigate={onNavigate}
            icon={<item.icon className="size-5" />}
          />
        ))}
      </SidebarSection>
    </>
  )
}

function StudioSidebarHeader() {
  return (
    <div className="flex items-center justify-between border-b border-stroke-soft-200 px-3.5 pb-3.5 pt-5">
      <div className="flex min-w-0 flex-col gap-0.5 pl-1.5">
        <Image
          src="/mainnet-logo.svg"
          alt="Mainnet Design"
          width={110}
          height={30}
          unoptimized
          priority
          className="dark:invert"
        />
        <p className="text-label-2xs text-text-soft-400">Estúdio de Design</p>
      </div>
      <ThemeToggle />
    </div>
  )
}

export default function StudioSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col self-start border-r border-stroke-soft-200 bg-bg-white-0 lg:flex">
        <StudioSidebarHeader />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <StudioNav />
        </div>
        <span className="pointer-events-none absolute -left-px top-[63px] z-10 size-1.5 -translate-x-1/2 border border-stroke-soft-200 bg-bg-white-0" />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex flex-col gap-0.5">
          <Image
            src="/mainnet-logo.svg"
            alt="Mainnet Design"
            width={90}
            height={25}
            unoptimized
            priority
            className="dark:invert"
          />
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
            <div className="flex flex-1 flex-col overflow-y-auto">
              <StudioNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
