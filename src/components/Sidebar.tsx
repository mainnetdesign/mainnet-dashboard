'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Receita, custo e margem',
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
    description: 'Diagnóstico de transações',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/relatorio',
    label: 'Relatório',
    description: 'Relatório mensal imprimível',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

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
                ? 'bg-white text-black'
                : 'text-[#999999] hover:bg-[#111111] hover:text-white'
            }`}
          >
            <span className={active ? 'text-black' : 'text-[#666666]'}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col h-screen bg-black border-r border-[#222222] sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#222222]">
          <Image
            src="/mainnet-logo.svg"
            alt="Mainnet Design"
            width={120}
            height={33}
            unoptimized
            priority
            style={{ filter: 'invert(1)' }}
          />
        </div>

        {nav}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#222222]">
          <p className="text-[10px] text-[#444444] leading-relaxed uppercase tracking-wider">Somente leitura · dados ao vivo</p>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-black border-b border-[#222222] flex items-center justify-between px-4 py-3">
          <Image
            src="/mainnet-logo.svg"
            alt="Mainnet Design"
            width={90}
            height={25}
            unoptimized
            priority
            style={{ filter: 'invert(1)' }}
          />
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-1.5 hover:bg-[#111111] transition-colors"
          aria-label="Menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-10 flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside className="relative w-56 bg-black border-r border-[#222222] shadow-xl flex flex-col pt-16" onClick={(e) => e.stopPropagation()}>
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}
