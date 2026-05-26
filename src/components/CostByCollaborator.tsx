'use client'
import { useState, useEffect } from 'react'
import { DashboardData, CollaboratorSummary } from '@/types'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

function fmtRate(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v) + '/h'
}

interface Props { data: DashboardData }

// ─── Drawer ──────────────────────────────────────────────────────────────────

function CollaboratorDrawer({
  collab,
  data,
  onClose,
}: {
  collab: CollaboratorSummary
  data: DashboardData
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  type ProjectRow = { name: string; hours: number; cost: number; pctOfHours: number; pctOfCost: number }

  // Projects this collaborator worked on, sorted by cost desc
  const projects: ProjectRow[] = data.costByProject
    .flatMap((p) => {
      const contrib = p.costByCollaborator[collab.id]
      if (!contrib) return []
      return [{
        name: p.projectName,
        hours: contrib.hours,
        cost: contrib.cost,
        pctOfHours: collab.totalHours > 0 ? (contrib.hours / collab.totalHours) * 100 : 0,
        pctOfCost:  collab.totalCost  > 0 ? (contrib.cost  / collab.totalCost)  * 100 : 0,
      }]
    })
    .sort((a, b) => b.cost - a.cost)

  // Monthly cost breakdown for this collaborator
  const monthlyBreakdown = data.monthly
    .map((m) => {
      const rate = m.collaboratorRates[collab.id]
      if (!rate) return null
      // Find hours from costByProject entries (not directly available per month per user,
      // but we can show the month rate)
      return { label: m.label, rate, month: m.month }
    })
    .filter(Boolean) as { label: string; rate: number; month: string }[]

  const topProject = projects[0]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.45)',
          opacity: visible ? 1 : 0,
          backdropFilter: 'blur(2px)',
        }}
        onClick={close}
      />

      {/* Drawer panel */}
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[var(--bg)] border-l border-[var(--bd)] shadow-2xl overflow-y-auto flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-[var(--bd)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: collab.color }}
            />
            <div>
              <h2 className="text-base font-bold text-[var(--tx)]">{collab.name}</h2>
              <p className="text-xs text-[var(--tx3)] mt-0.5">{projects.length} projeto{projects.length !== 1 ? 's' : ''} no período</p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center text-[var(--tx3)] hover:text-[var(--tx)] border border-[var(--bd)] hover:border-[var(--bd3)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-3 divide-x divide-[var(--bd)] border-b border-[var(--bd)] shrink-0">
          {[
            { label: 'Custo total', value: fmtBRL(collab.totalCost), color: 'var(--tx)' },
            { label: 'Horas totais', value: `${Math.round(collab.totalHours)}h`, color: '#FB923C' },
            { label: 'Taxa efetiva', value: fmtRate(collab.effectiveHourlyRate), color: '#60A5FA' },
          ].map((k) => (
            <div key={k.label} className="px-4 py-5 text-center">
              <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">{k.label}</p>
              <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Share of total ── */}
        <div className="px-6 py-4 border-b border-[var(--bd)] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--tx3)] uppercase tracking-wider">Participação no custo total</p>
            <p className="text-sm font-bold text-[var(--tx)]">{collab.percentOfTotal.toFixed(1)}%</p>
          </div>
          <div className="h-1.5 bg-[var(--bd)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${collab.percentOfTotal}%`, background: collab.color }}
            />
          </div>
        </div>

        {/* ── Projects ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-2">
            <p className="text-[11px] font-bold text-[var(--tx3)] uppercase tracking-wider">Projetos trabalhados</p>
          </div>

          {projects.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[var(--tx3)]">
              Nenhum projeto encontrado no período
            </div>
          ) : (
            <div className="divide-y divide-[var(--bd)]">
              {projects.map((p) => (
                <div key={p.name} className="px-6 py-4 hover:bg-[var(--bg3)] transition-colors">
                  {/* Project name + cost */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-[var(--tx)] leading-tight">{p.name}</p>
                    <p className="text-sm font-bold shrink-0" style={{ color: collab.color }}>
                      {fmtBRL(p.cost)}
                    </p>
                  </div>

                  {/* Hours + rate */}
                  <div className="flex items-center justify-between text-xs text-[var(--tx3)] mb-2.5">
                    <span style={{ color: '#FB923C' }}>{Math.round(p.hours * 10) / 10}h registradas</span>
                    <span>
                      {p.hours > 0
                        ? fmtRate(p.cost / p.hours) + ' efetivo'
                        : '—'}
                    </span>
                  </div>

                  {/* Mini bar — % of collaborator's total hours */}
                  <div className="h-1 bg-[var(--bd)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, p.pctOfHours)}%`,
                        background: collab.color,
                        opacity: 0.65,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--tx3)] mt-1">
                    {p.pctOfHours.toFixed(1)}% das horas · {p.pctOfCost.toFixed(1)}% do custo
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Monthly rate history ── */}
          {monthlyBreakdown.length > 0 && (
            <div className="border-t border-[var(--bd)] mt-2">
              <div className="px-6 pt-5 pb-2">
                <p className="text-[11px] font-bold text-[var(--tx3)] uppercase tracking-wider">Taxa por mês</p>
              </div>
              <div className="divide-y divide-[var(--bd)]">
                {monthlyBreakdown.map((m) => (
                  <div key={m.month} className="px-6 py-3 flex items-center justify-between">
                    <p className="text-xs text-[var(--tx2)]">{m.label}</p>
                    <p className="text-xs font-semibold" style={{ color: '#60A5FA' }}>
                      {fmtRate(m.rate)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom padding */}
          <div className="h-8" />
        </div>

        {/* ── Footer ── */}
        {topProject && (
          <div className="px-6 py-4 border-t border-[var(--bd)] shrink-0 bg-[var(--bg3)]">
            <p className="text-[11px] text-[var(--tx3)] uppercase tracking-wider mb-1">Projeto com mais horas</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--tx)]">{topProject.name}</p>
              <p className="text-xs font-bold" style={{ color: '#FB923C' }}>
                {Math.round(topProject.hours)}h · {topProject.pctOfHours.toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CostByCollaborator({ data }: Props) {
  const [selected, setSelected] = useState<CollaboratorSummary | null>(null)

  const totalMonths = (() => {
    const s = new Date(data.period.start)
    const e = new Date(data.period.end)
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
  })()

  return (
    <>
      <div className="bg-[var(--bg3)] p-6 border border-[var(--bd)]">
        <h2 className="text-base font-bold text-[var(--tx)] mb-1">Custo por colaborador</h2>
        <p className="text-sm text-[var(--tx2)] mb-6">Total no período de {totalMonths} meses</p>

        <div className="space-y-5">
          {data.collaborators.map((c) => (
            <div key={c.id}>
              <div className="flex items-baseline justify-between mb-1">
                {/* Clickable name */}
                <button
                  onClick={() => setSelected(c)}
                  className="text-sm font-semibold text-[var(--tx)] hover:underline underline-offset-2 text-left transition-colors"
                  style={{ color: 'var(--tx)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = c.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--tx)')}
                >
                  {c.name}
                </button>
                <div className="text-right">
                  <span className="text-sm font-bold text-[var(--tx)]">{fmtBRL(c.totalCost)}</span>
                  <span className="text-xs font-bold ml-2 text-[var(--tx3)]">{c.percentOfTotal.toFixed(1)}%</span>
                </div>
              </div>

              <div className="relative h-1.5 bg-[var(--bd)] mb-1">
                <div
                  className="absolute left-0 top-0 h-full transition-all"
                  style={{ width: `${c.percentOfTotal}%`, background: c.color }}
                />
              </div>

              <p className="text-xs" style={{ color: '#60A5FA' }}>{fmtRate(c.effectiveHourlyRate)}</p>
            </div>
          ))}

          <div className="border-t border-[var(--bd)] pt-4 flex justify-between">
            <span className="text-sm font-semibold text-[var(--tx2)]">Total geral</span>
            <span className="text-sm font-bold text-[var(--tx)]">{fmtBRL(data.totalCostAllCollaborators)}</span>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <CollaboratorDrawer
          collab={selected}
          data={data}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
