'use client'
import { useState } from 'react'
import { SUBSCRIPTIONS, SUBSCRIPTION_CATEGORIES, totalMonthlySubscriptions } from '@/config/subscriptions'
import WidgetCard from '@/components/ds/WidgetCard'

const CATEGORY_COLORS: Record<string, string> = {
  'SaaS IA':     '#7d52f4',
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
    <WidgetCard className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-label-sm">Custos Operacionais</h2>
          <p className="text-[2rem] mt-1">
            {fmtBRL(months > 1 ? totalPeriod : total)}
          </p>
          <p className="text-paragraph-xs mt-1">
            {months > 1 ? `${fmtBRL(total)}/mês × ${months} meses` : 'por mês · 11 assinaturas'}
          </p>
        </div>
        <div className="flex gap-1.5 mt-1">
          {SUBSCRIPTION_CATEGORIES.map((cat) => {
            const catTotal = SUBSCRIPTIONS.filter((s) => s.category === cat).reduce((a, s) => a + s.monthlyBRL, 0)
            const pct = Math.round((catTotal / total) * 100)
            return (
              <div key={cat} className="text-center">
                <div className="text-label-2xs" style={{ color: CATEGORY_COLORS[cat] }}>{pct}%</div>
                <div className="text-paragraph-xs">{cat.split(' ')[0]}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex h-2 overflow-hidden rounded-full">
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
            <div key={cat} className="overflow-hidden rounded-xl border border-stroke-soft-200">
              <button
                onClick={() => setExpanded(isOpen ? null : cat)}
                className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-bg-weak-50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                  <span className="text-label-sm">{cat}</span>
                  <span className="text-paragraph-xs">{items.length} assinaturas</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-label-sm">{fmtBRL(catTotal)}</span>
                  <svg
                    className="w-3.5 h-3.5 transition-transform"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-1 border-t border-stroke-soft-200 p-2">
                  {items.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg bg-bg-weak-50 px-3 py-2.5">
                      <span className="text-paragraph-sm">{sub.name}</span>
                      <span className="text-label-sm">{fmtBRL(sub.monthlyBRL)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </WidgetCard>
  )
}
