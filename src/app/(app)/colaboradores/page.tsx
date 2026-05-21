'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import DateRangePicker from '@/components/DateRangePicker'
import DashboardSkeleton from '@/components/DashboardSkeleton'
import { DashboardData } from '@/types'

const AUTO_REFRESH_MS = 60 * 60 * 1000
const DEFAULT_START = '2025-06-01'
const DEFAULT_END = new Date().toISOString().split('T')[0]

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

function UtilizationBadge({ pct }: { pct: number }) {
  const color = utilizationColor(pct)
  return (
    <span
      className="px-2 py-0.5 text-[11px] font-bold border"
      style={{ color, borderColor: color + '55', background: color + '11' }}
    >
      {pct.toFixed(1)}%
    </span>
  )
}

function StackedBar({
  productive,
  internal,
  idle,
  available,
}: {
  productive: number
  internal: number
  idle: number
  available: number
}) {
  if (available <= 0) return null
  const pPct = Math.max(0, (productive / available) * 100)
  const iPct = Math.max(0, (internal / available) * 100)
  const idlePct = Math.max(0, (idle / available) * 100)

  return (
    <div className="h-5 flex w-full overflow-hidden border border-[var(--bd)]">
      {pPct > 0 && (
        <div
          className="h-full transition-all"
          style={{ width: `${pPct}%`, background: '#22C55E' }}
          title={`Produtivas: ${productive.toFixed(1)}h`}
        />
      )}
      {iPct > 0 && (
        <div
          className="h-full transition-all"
          style={{ width: `${iPct}%`, background: '#FBBF24' }}
          title={`Internas: ${internal.toFixed(1)}h`}
        />
      )}
      {idlePct > 0 && (
        <div
          className="h-full transition-all"
          style={{ width: `${idlePct}%`, background: '#9CA3AF' }}
          title={`Ociosas: ${idle.toFixed(1)}h`}
        />
      )}
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

function CollaboratorCard({ m }: { m: CollaboratorMetrics }) {
  const uColor = utilizationColor(m.utilizationRate)

  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 shrink-0"
            style={{ background: m.color }}
          />
          <span className="font-bold text-[var(--tx)] text-base">{m.name}</span>
        </div>
        <UtilizationBadge pct={m.utilizationRate} />
      </div>

      {/* Stacked bar */}
      <div className="mb-3">
        <StackedBar
          productive={m.productiveHours}
          internal={m.internalHours}
          idle={m.idleHours}
          available={m.availableHours}
        />
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--tx3)] mb-4">
        <span style={{ color: '#22C55E' }}>{m.productiveHours.toFixed(1)}h produtivas</span>
        <span>·</span>
        <span style={{ color: '#FBBF24' }}>{m.internalHours.toFixed(1)}h internas</span>
        <span>·</span>
        <span style={{ color: '#9CA3AF' }}>{m.idleHours.toFixed(1)}h ociosas</span>
        <span>·</span>
        <span className="text-[var(--tx3)]">{m.availableHours.toFixed(0)}h disponíveis</span>
      </div>

      {/* Cost / rate */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-semibold" style={{ color: '#F87171' }}>
          {fmtBRL(m.totalCost)}
        </span>
        <span className="text-[var(--tx3)]">·</span>
        <span style={{ color: '#60A5FA' }}>
          {fmtBRL(m.effectiveHourlyRate)}/h
        </span>
        <span className="text-[var(--tx3)]">·</span>
        <span className="text-[var(--tx3)]">{m.totalHours.toFixed(1)}h registradas</span>
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

  const metrics: CollaboratorMetrics[] = data
    ? data.collaborators.map((c) => {
        // sum hours per collaborator across projects
        let productiveHours = 0
        let internalHours = 0

        for (const proj of data.costByProject) {
          const entry = proj.costByCollaborator[c.id]
          if (!entry) continue
          if (proj.isInternal) {
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
                {sortedMetrics.map((m) => (
                  <CollaboratorCard key={m.id} m={m} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
