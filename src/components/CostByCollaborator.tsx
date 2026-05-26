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

// ─── Inline SVG sparkline ─────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const W = 120, H = 32, pad = 2
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  // Area fill path
  const area = `M${pts[0]} L${pts.join(' L')} L${W - pad},${H - pad} L${pad},${H - pad} Z`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <path d={area} fill={color} fillOpacity={0.08} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      <circle
        cx={parseFloat(pts[pts.length - 1].split(',')[0])}
        cy={parseFloat(pts[pts.length - 1].split(',')[1])}
        r={2.5} fill={color}
      />
    </svg>
  )
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

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  type ProjectRow = {
    name: string; hours: number; cost: number
    pctOfHours: number; pctOfCost: number; isInternal: boolean
    revenue: number; result: number
  }

  // Projects this collaborator worked on
  const projects: ProjectRow[] = data.costByProject
    .flatMap((p) => {
      const contrib = p.costByCollaborator[collab.id]
      if (!contrib) return []
      const plEntry = data.pl.find((pl) => pl.clockifyProjectName === p.projectName)
      return [{
        name: p.projectName,
        hours: contrib.hours,
        cost: contrib.cost,
        pctOfHours: collab.totalHours > 0 ? (contrib.hours / collab.totalHours) * 100 : 0,
        pctOfCost:  collab.totalCost  > 0 ? (contrib.cost  / collab.totalCost)  * 100 : 0,
        isInternal: plEntry?.isInternal ?? false,
        revenue: plEntry?.revenue ?? 0,
        result:  plEntry?.result  ?? 0,
      }]
    })
    .sort((a, b) => b.cost - a.cost)

  // Productive vs internal breakdown
  const productiveHours = projects.filter((p) => !p.isInternal).reduce((s, p) => s + p.hours, 0)
  const internalHours   = projects.filter((p) =>  p.isInternal).reduce((s, p) => s + p.hours, 0)
  const totalH          = collab.totalHours || 1

  // Revenue attribution (only non-internal with revenue > 0)
  const revenueProjects = projects.filter((p) => !p.isInternal && p.revenue > 0)
  const totalRevenue    = revenueProjects.reduce((s, p) => s + p.revenue, 0)
  // Share: collaborator's cost on those projects vs their total revenue
  const costOnRevenue   = revenueProjects.reduce((s, p) => s + p.cost, 0)
  const netAttribution  = totalRevenue - costOnRevenue

  // Team average rate (excluding this collaborator)
  const others = data.collaborators.filter((c) => c.id !== collab.id && c.totalHours > 0)
  const avgRate = others.length > 0
    ? others.reduce((s, c) => s + c.effectiveHourlyRate, 0) / others.length
    : data.collaborators.reduce((s, c) => s + c.effectiveHourlyRate, 0) / (data.collaborators.length || 1)
  const rateDiff = avgRate > 0 ? ((collab.effectiveHourlyRate - avgRate) / avgRate) * 100 : 0
  const rateAbove = rateDiff >= 0

  // Sparkline: monthly cost sorted chronologically
  const monthlyCostMap = data.collaboratorMonthlyCosts[collab.id] ?? {}
  const sparkMonths = Object.keys(monthlyCostMap).sort()
  const sparkValues = sparkMonths.map((m) => monthlyCostMap[m])

  const topProject = projects[0]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.45)', opacity: visible ? 1 : 0, backdropFilter: 'blur(2px)' }}
        onClick={close}
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[var(--bg)] border-l border-[var(--bd)] shadow-2xl overflow-y-auto flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-[var(--bd)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: collab.color }} />
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
            { label: 'Custo total',  value: fmtBRL(collab.totalCost),              color: 'var(--tx)' },
            { label: 'Horas totais', value: `${Math.round(collab.totalHours)}h`,   color: '#FB923C' },
            { label: 'Taxa efetiva', value: fmtRate(collab.effectiveHourlyRate),    color: '#60A5FA' },
          ].map((k) => (
            <div key={k.label} className="px-4 py-5 text-center">
              <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">{k.label}</p>
              <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Comparação com média + sparkline ── */}
        <div className="grid grid-cols-2 divide-x divide-[var(--bd)] border-b border-[var(--bd)] shrink-0">

          {/* Vs team average */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">
              Vs média do time
            </p>
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-bold"
                style={{ color: rateAbove ? '#F87171' : '#22C55E' }}
              >
                {rateAbove ? '▲' : '▼'} {Math.abs(rateDiff).toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-[var(--tx3)] mt-1">
              Média: {fmtRate(avgRate)}
            </p>
          </div>

          {/* Sparkline */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">
              Custo mensal
            </p>
            {sparkValues.length >= 2 ? (
              <>
                <Sparkline values={sparkValues} color={collab.color} />
                <p className="text-[11px] text-[var(--tx3)] mt-1">
                  {sparkMonths[0]?.slice(0,7)} → {sparkMonths[sparkMonths.length-1]?.slice(0,7)}
                </p>
              </>
            ) : (
              <p className="text-xs text-[var(--tx3)]">Dados insuficientes</p>
            )}
          </div>
        </div>

        {/* ── Breakdown produtivo vs interno ── */}
        <div className="px-6 py-4 border-b border-[var(--bd)] shrink-0">
          <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-3">
            Distribuição de horas
          </p>
          {/* Segmented bar */}
          <div className="flex h-2 gap-0.5 rounded-full overflow-hidden mb-3">
            <div style={{ width: `${(productiveHours / totalH) * 100}%`, background: '#22C55E', minWidth: productiveHours > 0 ? 2 : 0 }} />
            <div style={{ width: `${(internalHours   / totalH) * 100}%`, background: '#FBBF24', minWidth: internalHours > 0 ? 2 : 0 }} />
          </div>
          <div className="flex gap-5 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: '#22C55E' }} />
              <span className="text-[var(--tx2)]">
                <span className="font-bold">{Math.round(productiveHours)}h</span>
                <span className="text-[var(--tx3)] ml-1">cliente</span>
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: '#FBBF24' }} />
              <span className="text-[var(--tx2)]">
                <span className="font-bold">{Math.round(internalHours)}h</span>
                <span className="text-[var(--tx3)] ml-1">interno</span>
              </span>
            </span>
            <span className="text-[var(--tx3)] ml-auto">
              {productiveHours > 0 ? `${((productiveHours / totalH) * 100).toFixed(0)}% produtivo` : 'sem horas de cliente'}
            </span>
          </div>
        </div>

        {/* ── Receita gerada vs custo ── */}
        {revenueProjects.length > 0 && (
          <div className="px-6 py-4 border-b border-[var(--bd)] shrink-0">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-3">
              Receita gerada vs custo
            </p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] text-[var(--tx3)] mb-1">Receita dos projetos</p>
                <p className="text-base font-bold" style={{ color: '#22C55E' }}>{fmtBRL(totalRevenue)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-[var(--tx3)] mb-1">Custo dele</p>
                <p className="text-base font-bold" style={{ color: '#F87171' }}>{fmtBRL(costOnRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[var(--tx3)] mb-1">Resultado líquido</p>
                <p className="text-base font-bold" style={{ color: netAttribution >= 0 ? '#22C55E' : '#F87171' }}>
                  {netAttribution >= 0 ? '+' : ''}{fmtBRL(netAttribution)}
                </p>
              </div>
            </div>
            {/* Mini bar: cost share of revenue */}
            <div className="mt-3 h-1.5 bg-[var(--bd)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, totalRevenue > 0 ? (costOnRevenue / totalRevenue) * 100 : 0)}%`,
                  background: '#F87171',
                }}
              />
            </div>
            <p className="text-[11px] text-[var(--tx3)] mt-1">
              Custo representa {totalRevenue > 0 ? ((costOnRevenue / totalRevenue) * 100).toFixed(1) : 0}% da receita
            </p>
          </div>
        )}

        {/* ── Participação no custo total ── */}
        <div className="px-6 py-4 border-b border-[var(--bd)] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider">Participação no custo total</p>
            <p className="text-sm font-bold text-[var(--tx)]">{collab.percentOfTotal.toFixed(1)}%</p>
          </div>
          <div className="h-1.5 bg-[var(--bd)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${collab.percentOfTotal}%`, background: collab.color }}
            />
          </div>
        </div>

        {/* ── Projetos ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-2">
            <p className="text-[11px] font-bold text-[var(--tx3)] uppercase tracking-wider">Projetos trabalhados</p>
          </div>

          {projects.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--tx3)]">Nenhum projeto encontrado</p>
          ) : (
            <div className="divide-y divide-[var(--bd)]">
              {projects.map((p) => (
                <div key={p.name} className="px-6 py-4 hover:bg-[var(--bg3)] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-[var(--tx)] truncate">{p.name}</p>
                      {p.isInternal && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 font-semibold border"
                          style={{ color: '#FBBF24', borderColor: '#FBBF2433', background: '#FBBF2410' }}>
                          interno
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold shrink-0" style={{ color: collab.color }}>
                      {fmtBRL(p.cost)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--tx3)] mb-2">
                    <span style={{ color: '#FB923C' }}>{Math.round(p.hours * 10) / 10}h</span>
                    <span>{p.hours > 0 ? fmtRate(p.cost / p.hours) + ' efetivo' : '—'}</span>
                  </div>
                  <div className="h-1 bg-[var(--bd)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, p.pctOfHours)}%`,
                      background: p.isInternal ? '#FBBF24' : collab.color,
                      opacity: 0.6,
                    }} />
                  </div>
                  <p className="text-[10px] text-[var(--tx3)] mt-1">
                    {p.pctOfHours.toFixed(1)}% das horas · {p.pctOfCost.toFixed(1)}% do custo
                  </p>
                </div>
              ))}
            </div>
          )}
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
                <button
                  onClick={() => setSelected(c)}
                  className="text-sm font-semibold text-left transition-colors hover:underline underline-offset-2"
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
                <div className="absolute left-0 top-0 h-full transition-all"
                  style={{ width: `${c.percentOfTotal}%`, background: c.color }} />
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

      {selected && (
        <CollaboratorDrawer collab={selected} data={data} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
