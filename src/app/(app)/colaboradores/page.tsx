'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import DateRangePicker from '@/components/DateRangePicker'
import DashboardSkeleton from '@/components/DashboardSkeleton'
import RatesEditor from '@/components/RatesEditor'
import { DashboardData } from '@/types'

const AUTO_REFRESH_MS = 60 * 60 * 1000
const DEFAULT_END = new Date().toISOString().split('T')[0]
const DEFAULT_START = (() => {
  const d = new Date(); d.setMonth(d.getMonth() - 6); d.setDate(1)
  return d.toISOString().split('T')[0]
})()

// ─── helpers ────────────────────────────────────────────────────────────────

function countWorkingDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function utilizationColor(pct: number) {
  if (pct >= 70) return '#22C55E'
  if (pct >= 40) return '#FBBF24'
  return '#F87171'
}

function utilizationLabel(pct: number) {
  if (pct >= 70) return 'verde'
  if (pct >= 40) return 'amarelo'
  return 'vermelho'
}

// ─── types ───────────────────────────────────────────────────────────────────

interface CollaboratorMetrics {
  id: string
  name: string
  color: string
  totalHours: number
  totalCost: number
  effectiveHourlyRate: number
  percentOfTotal: number
  availableHours: number
  productiveHours: number
  internalHours: number
  overheadHours: number
  idleHours: number
  utilizationRate: number
}

// ─── sub-components ──────────────────────────────────────────────────────────

/** SVG ring gauge for utilization */
function UtilizationRing({ pct }: { pct: number }) {
  const color = utilizationColor(pct)
  const size = 80
  const stroke = 6
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--bd)"
          strokeWidth={stroke}
        />
        {/* fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-sm font-bold leading-none" style={{ color }}>
          {pct.toFixed(0)}%
        </span>
        <span className="text-[10px] text-[var(--tx3)] leading-none">util.</span>
      </div>
    </div>
  )
}

function SegmentedBar({
  productive, internal, idle, available,
}: {
  productive: number; internal: number; idle: number; available: number
}) {
  if (available <= 0) return null
  const pPct = Math.min((productive / available) * 100, 100)
  const iPct = Math.min((internal / available) * 100, 100 - pPct)
  const idlePct = Math.min((idle / available) * 100, 100 - pPct - iPct)

  return (
    <div className="flex w-full gap-0.5" style={{ height: 8 }}>
      <div style={{ width: `${Math.max(0, pPct)}%`, background: '#22C55E', borderRadius: 3 }} title={`Produtivas: ${productive.toFixed(1)}h`} />
      <div style={{ width: `${Math.max(0, iPct)}%`, background: '#FBBF24', borderRadius: 3 }} title={`Internas: ${internal.toFixed(1)}h`} />
      <div style={{ width: `${Math.max(0, idlePct)}%`, background: '#D1D5DB', borderRadius: 3 }} title={`Ociosas: ${idle.toFixed(1)}h`} />
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--tx3)]">{label}</span>
      <span className="text-base font-bold" style={{ color: color ?? 'var(--tx)' }}>{value}</span>
    </div>
  )
}

function KPICard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
}) {
  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)] p-5">
      <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">{label}</p>
      <p
        className="text-3xl font-bold leading-tight mb-1"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-sm text-[var(--tx2)]">{sub}</p>}
    </div>
  )
}

function CollaboratorCard({ m, rank }: { m: CollaboratorMetrics; rank: number }) {
  const uColor = utilizationColor(m.utilizationRate)

  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)] p-6 flex flex-col gap-5">

      {/* ── top row: rank + name + ring ── */}
      <div className="flex items-center gap-4">
        {/* rank number */}
        <span className="text-[11px] font-bold text-[var(--tx3)] w-4 shrink-0 tabular-nums">#{rank}</span>

        {/* color dot + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
            <span className="font-bold text-[var(--tx)] text-base truncate">{m.name}</span>
          </div>
          <p className="text-xs text-[var(--tx3)] ml-4.5">
            {m.totalHours.toFixed(0)}h registradas · {m.availableHours.toFixed(0)}h disponíveis
          </p>
        </div>

        {/* ring gauge */}
        <UtilizationRing pct={m.utilizationRate} />
      </div>

      {/* ── segmented bar ── */}
      <div className="flex flex-col gap-2">
        <SegmentedBar
          productive={m.productiveHours}
          internal={m.internalHours}
          idle={m.idleHours}
          available={m.availableHours}
        />
        {/* bar labels */}
        <div className="flex items-center gap-4 text-xs text-[var(--tx2)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: '#22C55E' }} />
            <span style={{ color: '#22C55E' }} className="font-semibold">{m.productiveHours.toFixed(0)}h</span>
            <span className="text-[var(--tx3)]">produtivas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: '#FBBF24' }} />
            <span style={{ color: '#FBBF24' }} className="font-semibold">{m.internalHours.toFixed(0)}h</span>
            <span className="text-[var(--tx3)]">internas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: '#D1D5DB' }} />
            <span className="font-semibold text-[var(--tx2)]">{m.idleHours.toFixed(0)}h</span>
            <span className="text-[var(--tx3)]">ociosas</span>
          </span>
        </div>
      </div>

      {/* ── divider ── */}
      <div className="border-t border-[var(--bd)]" />

      {/* ── stats grid ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCell label="Custo" value={fmtBRL(m.totalCost)} color="#F87171" />
        <StatCell label="Taxa/h" value={`${fmtBRL(m.effectiveHourlyRate)}/h`} color="#60A5FA" />
        <StatCell label="Ociosidade" value={`${(100 - m.utilizationRate).toFixed(1)}%`} color={m.idleHours > m.availableHours * 0.4 ? '#F87171' : '#9CA3AF'} />
      </div>

    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function ColaboradoresPage() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [editingRates, setEditingRates] = useState(false)
  const startRef = useRef(DEFAULT_START)
  const endRef = useRef(DEFAULT_END)

  const fetchData = useCallback(async (s: string, e: string, bust = false) => {
    setLoading(true)
    setError(null)
    try {
      const bustParam = bust ? '&bust=1' : ''
      const res = await fetch(`/api/dashboard?start=${s}&end=${e}${bustParam}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao carregar dados')
      }
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(startRef.current, endRef.current)
    const interval = setInterval(() => {
      fetchData(startRef.current, endRef.current)
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  function handleRangeChange(newStart: string, newEnd: string) {
    setStart(newStart)
    setEnd(newEnd)
    startRef.current = newStart
    endRef.current = newEnd
    fetchData(newStart, newEnd)
  }

  function formatLastUpdated(date: Date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000)
    if (diff < 1) return 'agora mesmo'
    if (diff === 1) return 'há 1 minuto'
    return `há ${diff} minutos`
  }

  // ── derived metrics ────────────────────────────────────────────────────────

  const workingDays = countWorkingDays(start, end)
  const availableHoursPerPerson = workingDays * 6

  // build a set of internal project IDs from the PL table
  const internalProjectIds = new Set(
    (data?.pl ?? []).filter((p) => p.isInternal).map((p) => p.clockifyProjectId)
  )

  const metrics: CollaboratorMetrics[] = data
    ? data.collaborators.map((c) => {
        // sum hours per collaborator across projects
        let productiveHours = 0
        let internalHours = 0

        for (const proj of data.costByProject) {
          const entry = proj.costByCollaborator[c.id]
          if (!entry) continue
          if (internalProjectIds.has(proj.projectId)) {
            internalHours += entry.hours
          } else {
            productiveHours += entry.hours
          }
        }

        const overheadHours = Math.max(0, c.totalHours - productiveHours - internalHours)
        const idleHours = Math.max(0, availableHoursPerPerson - c.totalHours)
        const utilizationRate =
          availableHoursPerPerson > 0
            ? (productiveHours / availableHoursPerPerson) * 100
            : 0

        return {
          id: c.id,
          name: c.name,
          color: c.color,
          totalHours: c.totalHours,
          totalCost: c.totalCost,
          effectiveHourlyRate: c.effectiveHourlyRate,
          percentOfTotal: c.percentOfTotal,
          availableHours: availableHoursPerPerson,
          productiveHours,
          internalHours,
          overheadHours,
          idleHours,
          utilizationRate,
        }
      })
    : []

  const sortedMetrics = [...metrics].sort((a, b) => b.utilizationRate - a.utilizationRate)

  const avgUtilization =
    metrics.length > 0
      ? metrics.reduce((s, m) => s + m.utilizationRate, 0) / metrics.length
      : 0

  const mostProductive = sortedMetrics[0] ?? null
  const totalIdleHours = metrics.reduce((s, m) => s + m.idleHours, 0)
  const totalAvailableHours = metrics.length * availableHoursPerPerson

  return (
    <div>
      {/* ── sticky header ── */}
      <header className="bg-[var(--bg)] border-b border-[var(--bd)] sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="font-bold text-[var(--tx)] text-lg">Colaboradores</span>
            {lastUpdated && (
              <p className="text-[11px] text-[var(--tx3)] leading-none mt-0.5 uppercase tracking-wider">
                Atualizado {formatLastUpdated(lastUpdated)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DateRangePicker start={start} end={end} onChange={handleRangeChange} />
            <button
              onClick={() => setEditingRates(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[var(--bd)] text-[var(--tx2)] hover:border-[var(--bd3)] hover:text-[var(--tx)] transition-colors"
              title="Editar taxas e salários"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Editar taxas
            </button>
            <button
              onClick={() => fetchData(start, end, true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[var(--bd)] text-[var(--tx2)] hover:border-[var(--bd3)] hover:text-[var(--tx)] disabled:opacity-40 transition-colors"
              title="Atualizar dados (ignora cache)"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {loading && <DashboardSkeleton />}

        {!loading && error && (
          <div className="bg-[var(--bg3)] border border-[var(--bd)] p-6 text-center">
            <p className="text-[var(--tx)] font-semibold mb-1">Erro ao carregar dados</p>
            <p className="text-[var(--tx2)] text-sm">{error}</p>
            <button
              onClick={() => fetchData(start, end)}
              className="mt-4 px-4 py-2 bg-[var(--inv)] text-[var(--inv-tx)] text-sm hover:opacity-80 transition-opacity"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── KPI row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mb-8 border border-[var(--bd)]">
              <KPICard
                label="UTILIZAÇÃO MÉDIA"
                value={`${avgUtilization.toFixed(1)}%`}
                sub={`${metrics.length} colaborador${metrics.length !== 1 ? 'es' : ''}`}
                valueColor={utilizationColor(avgUtilization)}
              />
              <KPICard
                label="MAIS PRODUTIVO"
                value={mostProductive?.name ?? '—'}
                sub={mostProductive ? `${mostProductive.utilizationRate.toFixed(1)}% utilização` : undefined}
                valueColor={mostProductive ? utilizationColor(mostProductive.utilizationRate) : undefined}
              />
              <KPICard
                label="HORAS OCIOSAS"
                value={`${totalIdleHours.toFixed(0)}h`}
                sub={`de ${totalAvailableHours.toFixed(0)}h disponíveis no total`}
                valueColor="#FB923C"
              />
            </div>

            {/* ── period info + legend ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <p className="text-xs text-[var(--tx3)] uppercase tracking-wider font-semibold">
                {workingDays} dias úteis · {availableHoursPerPerson}h disponíveis/pessoa
              </p>
              <div className="flex items-center gap-4 text-xs text-[var(--tx3)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block shrink-0" style={{ background: '#22C55E' }} />
                  Produtivas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block shrink-0" style={{ background: '#FBBF24' }} />
                  Internas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block shrink-0" style={{ background: '#9CA3AF' }} />
                  Ociosas
                </span>
              </div>
            </div>

            {/* ── collaborator cards ── */}
            {sortedMetrics.length === 0 ? (
              <div className="bg-[var(--bg3)] border border-[var(--bd)] p-10 text-center">
                <p className="text-[var(--tx3)] text-sm">Nenhum colaborador encontrado no período.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-px border border-[var(--bd)]">
                {sortedMetrics.map((m, i) => (
                  <CollaboratorCard key={m.id} m={m} rank={i + 1} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {editingRates && (
        <RatesEditor
          onClose={() => setEditingRates(false)}
          onSaved={() => { setEditingRates(false); fetchData(startRef.current, endRef.current, true) }}
        />
      )}
    </div>
  )
}
