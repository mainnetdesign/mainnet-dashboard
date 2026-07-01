'use client'
import { useState, useEffect } from 'react'
import { DashboardData, CollaboratorSummary } from '@/types'
import RatesEditor from './RatesEditor'

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

// ─── Full-width sparkline ────────────────────────────────────────────────────

function SparklineFull({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const W = 320, H = 52, pX = 2, pY = 4
  const pts = values.map((v, i) => {
    const x = pX + (i / (values.length - 1)) * (W - pX * 2)
    const y = pY + (1 - (v - min) / range) * (H - pY * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const polyline = pts.join(' ')
  const area = `M${pts[0]} L${pts.join(' L')} L${(W - pX).toFixed(1)},${H} L${pX},${H} Z`
  const [lx, ly] = pts[pts.length - 1].split(',')
  const gradId = `sg-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 52 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  )
}

// ─── Section label with extending rule ──────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <p className="text-label-2xs shrink-0">{children}</p>
      <div className="flex-1 h-px bg-stroke-soft-200" />
    </div>
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

  const productiveHours = projects.filter((p) => !p.isInternal).reduce((s, p) => s + p.hours, 0)
  const internalHours   = projects.filter((p) =>  p.isInternal).reduce((s, p) => s + p.hours, 0)
  const totalH          = collab.totalHours || 1

  const revenueProjects = projects.filter((p) => !p.isInternal && p.revenue > 0)
  const totalRevenue    = revenueProjects.reduce((s, p) => s + p.revenue, 0)
  const costOnRevenue   = revenueProjects.reduce((s, p) => s + p.cost, 0)
  const netAttribution  = totalRevenue - costOnRevenue

  const others = data.collaborators.filter((c) => c.id !== collab.id && c.totalHours > 0)
  const avgRate = others.length > 0
    ? others.reduce((s, c) => s + c.effectiveHourlyRate, 0) / others.length
    : data.collaborators.reduce((s, c) => s + c.effectiveHourlyRate, 0) / (data.collaborators.length || 1)
  const rateDiff = avgRate > 0 ? ((collab.effectiveHourlyRate - avgRate) / avgRate) * 100 : 0
  const rateAbove = rateDiff >= 0

  const monthlyCostMap = (data.collaboratorMonthlyCosts ?? {})[collab.id] ?? {}
  const sparkMonths = Object.keys(monthlyCostMap).sort()
  const sparkValues = sparkMonths.map((m) => monthlyCostMap[m])

  // Initials from name
  const initials = collab.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.5)',
          opacity: visible ? 1 : 0,
          backdropFilter: 'blur(3px)',
        }}
        onClick={close}
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[420px] bg-bg-weak-50 shadow-2xl overflow-y-auto flex flex-col transition-transform duration-300 ease-out"
        style={{
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '1px solid var(--color-stroke-soft-200)',
        }}
      >
        {/* Accent strip */}
        <div className="h-[3px] shrink-0" style={{ background: collab.color }} />

        {/* ── Header ── */}
        <div className="px-7 pt-6 pb-5 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Avatar circle */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-label-xs shrink-0"
              style={{ background: collab.color + '22', color: collab.color, border: `1.5px solid ${collab.color}44` }}
            >
              {initials}
            </div>
            <div>
              <h2 className="text-label-md">{collab.name}</h2>
              <p className="text-paragraph-xs mt-0.5">
                {projects.length} projeto{projects.length !== 1 ? 's' : ''} no período
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-7 h-7 flex items-center justify-center text-text-soft-400 hover:text-text-strong-950 transition-colors mt-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Hero: big cost ── */}
        <div className="px-7 pb-6 shrink-0">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-paragraph-xs mb-1.5">Custo total</p>
              <p className="text-[2.4rem]">
                {fmtBRL(collab.totalCost)}
              </p>
            </div>
            <div className="text-right pb-1">
              <p className="text-paragraph-xs mb-1.5">Do total</p>
              <p className="text-title-h5" style={{ color: collab.color }}>
                {collab.percentOfTotal.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Participation bar */}
          <div className="mt-4 h-[3px] bg-stroke-soft-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${collab.percentOfTotal}%`, background: collab.color }}
            />
          </div>
        </div>

        {/* ── Secondary stats ── */}
        <div className="px-7 pb-6 flex gap-7 shrink-0">
          <div>
            <p className="text-paragraph-xs mb-1.5">Horas</p>
            <p className="text-title-h6" style={{ color: '#fa7319' }}>
              {Math.round(collab.totalHours)}h
            </p>
          </div>
          <div>
            <p className="text-paragraph-xs mb-1.5">Taxa efetiva</p>
            <p className="text-title-h6" style={{ color: '#335cff' }}>
              {fmtRate(collab.effectiveHourlyRate)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-paragraph-xs mb-1.5">Vs time</p>
            <p className="text-title-h6" style={{ color: rateAbove ? '#fb3748' : '#1fc16b' }}>
              {rateAbove ? '▲' : '▼'} {Math.abs(rateDiff).toFixed(1)}%
            </p>
            <p className="text-paragraph-xs mt-1">média {fmtRate(avgRate)}</p>
          </div>
        </div>

        <div className="mx-7 border-t border-stroke-soft-200 shrink-0" />

        {/* ── Evolução mensal (sparkline) ── */}
        {sparkValues.length >= 2 && (
          <div className="px-7 py-6 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Evolução mensal</SectionLabel>
              <p className="text-paragraph-xs -mt-5">
                {sparkMonths[0]?.slice(0, 7)} → {sparkMonths[sparkMonths.length - 1]?.slice(0, 7)}
              </p>
            </div>
            <SparklineFull values={sparkValues} color={collab.color} />
            <div className="flex justify-between mt-2">
              <span className="text-paragraph-xs">{fmtBRL(Math.min(...sparkValues))}</span>
              <span className="text-paragraph-xs">{fmtBRL(Math.max(...sparkValues))}</span>
            </div>
          </div>
        )}

        {sparkValues.length >= 2 && <div className="mx-7 border-t border-stroke-soft-200 shrink-0" />}

        {/* ── Distribuição de horas ── */}
        <div className="px-7 py-6 shrink-0">
          <SectionLabel>Distribuição de horas</SectionLabel>

          {/* Segmented bar */}
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-4">
            <div
              style={{
                width: `${(productiveHours / totalH) * 100}%`,
                background: '#1fc16b',
                minWidth: productiveHours > 0 ? 3 : 0,
              }}
            />
            <div
              style={{
                width: `${(internalHours / totalH) * 100}%`,
                background: '#f6b51e',
                minWidth: internalHours > 0 ? 3 : 0,
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-5 text-paragraph-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: '#1fc16b' }} />
                <span >{Math.round(productiveHours)}h</span>
                <span >cliente</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: '#f6b51e' }} />
                <span >{Math.round(internalHours)}h</span>
                <span >interno</span>
              </span>
            </div>
            <span className="text-paragraph-xs">
              {productiveHours > 0
                ? `${((productiveHours / totalH) * 100).toFixed(0)}% produtivo`
                : 'sem horas de cliente'}
            </span>
          </div>
        </div>

        {/* ── Receita vs custo ── */}
        {revenueProjects.length > 0 && (
          <>
            <div className="mx-7 border-t border-stroke-soft-200 shrink-0" />
            <div className="px-7 py-6 shrink-0">
              <SectionLabel>Receita gerada vs custo</SectionLabel>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-paragraph-xs mb-1.5">Receita</p>
                  <p className="text-title-h6" style={{ color: '#1fc16b' }}>
                    {fmtBRL(totalRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-paragraph-xs mb-1.5">Custo dele</p>
                  <p className="text-title-h6" style={{ color: '#fb3748' }}>
                    {fmtBRL(costOnRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-paragraph-xs mb-1.5">Resultado</p>
                  <p className="text-title-h6" style={{ color: netAttribution >= 0 ? '#1fc16b' : '#fb3748' }}>
                    {netAttribution >= 0 ? '+' : ''}{fmtBRL(netAttribution)}
                  </p>
                </div>
              </div>

              {/* Cost-share bar */}
              <div className="h-1.5 bg-stroke-soft-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, totalRevenue > 0 ? (costOnRevenue / totalRevenue) * 100 : 0)}%`,
                    background: '#fb3748',
                  }}
                />
              </div>
              <p className="text-paragraph-xs mt-2">
                Custo representa {totalRevenue > 0 ? ((costOnRevenue / totalRevenue) * 100).toFixed(1) : 0}% da receita
              </p>
            </div>
          </>
        )}

        {/* ── Projetos ── */}
        <div className="mx-7 border-t border-stroke-soft-200 shrink-0" />
        <div className="flex-1 overflow-y-auto">
          <div className="px-7 pt-6 pb-2">
            <SectionLabel>Projetos trabalhados ({projects.length})</SectionLabel>
          </div>

          {projects.length === 0 ? (
            <p className="px-7 py-10 text-center text-paragraph-sm">Nenhum projeto encontrado</p>
          ) : (
            <div className="px-7 space-y-5 pb-8">
              {projects.map((p) => (
                <div key={p.name}>
                  {/* Name row */}
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-label-sm truncate">{p.name}</p>
                      {p.isInternal && (
                        <span
                          className="shrink-0 text-label-2xs px-1.5 py-0.5"
                          style={{ color: '#f6b51e', background: '#f6b51e12', border: '1px solid #f6b51e30' }}
                        >
                          interno
                        </span>
                      )}
                    </div>
                    <p className="text-label-sm shrink-0" style={{ color: collab.color }}>
                      {fmtBRL(p.cost)}
                    </p>
                  </div>

                  {/* Sub-row */}
                  <div className="flex items-center justify-between text-paragraph-xs mb-2">
                    <span style={{ color: '#fa7319' }}>{Math.round(p.hours * 10) / 10}h</span>
                    <span >
                      {p.hours > 0 ? fmtRate(p.cost / p.hours) : '—'}
                    </span>
                    <span >
                      {p.pctOfHours.toFixed(1)}% das horas
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-[2px] bg-stroke-soft-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, p.pctOfHours)}%`,
                        background: p.isInternal ? '#f6b51e' : collab.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CostByCollaborator({ data, onRatesChanged }: Props & { onRatesChanged?: () => void }) {
  const [selected, setSelected] = useState<CollaboratorSummary | null>(null)
  const [editingRates, setEditingRates] = useState(false)

  const totalMonths = (() => {
    const s = new Date(data.period.start)
    const e = new Date(data.period.end)
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
  })()

  return (
    <>
      <div className="bg-bg-white-0 p-6 border border-stroke-soft-200">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-label-md">Custo por colaborador</h2>
          <button
            onClick={() => setEditingRates(true)}
            className="flex items-center gap-1.5 text-xs text-text-soft-400 hover:text-text-strong-950 transition-colors"
            title="Editar taxas e salários"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Editar taxas
          </button>
        </div>
        <p className="text-paragraph-sm mb-6">Total no período de {totalMonths} meses</p>

        <div className="space-y-5">
          {data.collaborators.map((c) => (
            <div key={c.id}>
              <div className="flex items-baseline justify-between mb-1">
                <button
                  onClick={() => setSelected(c)}
                  className="text-sm font-semibold text-left transition-colors hover:underline underline-offset-2"
                  style={{ color: 'var(--color-text-strong-950)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = c.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-strong-950)')}
                >
                  {c.name}
                </button>
                <div className="text-right">
                  <span className="text-label-sm">{fmtBRL(c.totalCost)}</span>
                  <span className="text-label-xs ml-2">{c.percentOfTotal.toFixed(1)}%</span>
                </div>
              </div>
              <div className="relative h-1.5 bg-stroke-soft-200 mb-1">
                <div className="absolute left-0 top-0 h-full transition-all"
                  style={{ width: `${c.percentOfTotal}%`, background: c.color }} />
              </div>
              <p className="text-paragraph-xs" style={{ color: '#335cff' }}>{fmtRate(c.effectiveHourlyRate)}</p>
            </div>
          ))}

          <div className="border-t border-stroke-soft-200 pt-4 flex justify-between">
            <span className="text-label-sm">Total geral</span>
            <span className="text-label-sm">{fmtBRL(data.totalCostAllCollaborators)}</span>
          </div>
        </div>
      </div>

      {selected && (
        <CollaboratorDrawer collab={selected} data={data} onClose={() => setSelected(null)} />
      )}

      {editingRates && (
        <RatesEditor
          onClose={() => setEditingRates(false)}
          onSaved={() => { setEditingRates(false); onRatesChanged?.() }}
        />
      )}
    </>
  )
}
