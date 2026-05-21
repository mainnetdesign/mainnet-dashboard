'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/auditoria',
    label: 'Auditoria',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/colaboradores',
    label: 'Colaboradores',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/relatorio',
    label: 'Relatório',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className="w-8 h-8 flex items-center justify-center border border-[var(--bd)] text-[var(--tx3)] hover:border-[var(--bd3)] hover:text-[var(--tx)] transition-colors"
    >
      {isDark ? (
        /* Sun icon */
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        /* Moon icon */
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? 'bg-[var(--inv)] text-[var(--inv-tx)]'
                : 'text-[var(--tx2)] hover:bg-[var(--bg3)] hover:text-[var(--tx)]'
            }`}
          >
            <span className={active ? 'text-[var(--inv-tx)]' : 'text-[var(--tx3)]'}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col h-screen bg-[var(--bg)] border-r border-[var(--bd)] sticky top-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[var(--bd)] flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <Image
              src="/mainnet-logo.svg"
              alt="Mainnet Design"
              width={110}
              height={30}
              unoptimized
              priority
              className="dark:invert"
            />
            <p className="text-[10px] font-semibold text-[var(--tx3)] uppercase tracking-widest">Estúdio de Design</p>
          </div>
          <ThemeToggle />
        </div>

        {nav}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--bd)]">
          <p className="text-[10px] text-[var(--tx3)] leading-relaxed uppercase tracking-wider">Somente leitura · dados ao vivo</p>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-[var(--bg)] border-b border-[var(--bd)] flex items-center justify-between px-4 py-3">
        <Image
          src="/mainnet-logo.svg"
          alt="Mainnet Design"
          width={90}
          height={25}
          unoptimized
          priority
          className="dark:invert"
        />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-1.5 hover:bg-[var(--bg3)] transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5 text-[var(--tx2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--tx2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-10 flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside className="relative w-56 bg-[var(--bg)] border-r border-[var(--bd)] shadow-xl flex flex-col pt-16" onClick={(e) => e.stopPropagation()}>
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}
