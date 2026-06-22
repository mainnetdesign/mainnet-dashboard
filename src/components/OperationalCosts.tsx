'use client'
import { useState } from 'react'
import { SUBSCRIPTIONS, SUBSCRIPTION_CATEGORIES, totalMonthlySubscriptions } from '@/config/subscriptions'

const CATEGORY_COLORS: Record<string, string> = {
  'SaaS IA':     '#6366F1',
  'Design':      '#F59E0B',
  'Comunicação': '#10B981',
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v)
}

export default function OperationalCosts({ months = 1 }: { months?: number }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const total = totalMonthlySubscriptions()
  const totalPeriod = total * months

  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)] p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--tx3)]">Custos Operacionais</h2>
          <p className="text-[2rem] font-black text-[var(--tx)] leading-none mt-1">
            {fmtBRL(months > 1 ? totalPeriod : total)}
          </p>
          <p className="text-xs text-[var(--tx3)] mt-1">
            {months > 1 ? `${fmtBRL(total)}/mês × ${months} meses` : 'por mês · 11 assinaturas'}
          </p>
        </div>
        <div className="flex gap-1.5 mt-1">
          {SUBSCRIPTION_CATEGORIES.map((cat) => {
            const catTotal = SUBSCRIPTIONS.filter((s) => s.category === cat).reduce((a, s) => a + s.monthlyBRL, 0)
            const pct = Math.round((catTotal / total) * 100)
            return (
              <div key={cat} className="text-center">
                <div className="text-[10px] font-bold" style={{ color: CATEGORY_COLORS[cat] }}>{pct}%</div>
                <div className="text-[9px] text-[var(--tx3)]">{cat.split(' ')[0]}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden mb-5 gap-px">
        {SUBSCRIPTION_CATEGORIES.map((cat) => {
          const catTotal = SUBSCRIPTIONS.filter((s) => s.category === cat).reduce((a, s) => a + s.monthlyBRL, 0)
          return (
            <div
              key={cat}
              style={{ flex: catTotal / total, background: CATEGORY_COLORS[cat] }}
            />
          )
        })}
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {SUBSCRIPTION_CATEGORIES.map((cat) => {
          const items = SUBSCRIPTIONS.filter((s) => s.category === cat)
          const catTotal = items.reduce((a, s) => a + s.monthlyBRL, 0)
          const isOpen = expanded === cat

          return (
            <div key={cat} className="border border-[var(--bd)] overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : cat)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg4)] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                  <span className="text-sm font-medium text-[var(--tx)]">{cat}</span>
                  <span className="text-xs text-[var(--tx3)]">{items.length} assinaturas</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--tx)]">{fmtBRL(catTotal)}</span>
                  <svg
                    className="w-3.5 h-3.5 text-[var(--tx3)] transition-transform"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[var(--bd)] divide-y divide-[var(--bd)]">
                  {items.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg4)]">
                      <span className="text-sm text-[var(--tx2)]">{sub.name}</span>
                      <span className="text-sm font-medium text-[var(--tx)]">{fmtBRL(sub.monthlyBRL)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
