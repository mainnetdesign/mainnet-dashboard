'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import DateRangePicker from '@/components/DateRangePicker'
import DashboardSkeleton from '@/components/DashboardSkeleton'
import RatesEditor from '@/components/RatesEditor'
import PageHeader from '@/components/shell/PageHeader'
import StudioPageActions from '@/components/studio/StudioPageActions'
import StatWidget from '@/components/ds/StatWidget'
import WidgetCard from '@/components/ds/WidgetCard'
import * as Button from '@/components/ui/button'
import { RiSettings3Line } from '@remixicon/react'
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
  if (pct >= 70) return '#1fc16b'
  if (pct >= 40) return '#f6b51e'
  return '#fb3748'
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
          stroke="var(--color-stroke-soft-200)"
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
        <span className="text-label-sm" style={{ color }}>
          {pct.toFixed(0)}%
        </span>
        <span className="text-paragraph-xs">util.</span>
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
      <div style={{ width: `${Math.max(0, pPct)}%`, background: '#1fc16b', borderRadius: 3 }} title={`Produtivas: ${productive.toFixed(1)}h`} />
      <div style={{ width: `${Math.max(0, iPct)}%`, background: '#f6b51e', borderRadius: 3 }} title={`Internas: ${internal.toFixed(1)}h`} />
      <div style={{ width: `${Math.max(0, idlePct)}%`, background: '#d1d1d1', borderRadius: 3 }} title={`Ociosas: ${idle.toFixed(1)}h`} />
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-2xs">{label}</span>
      <span className="text-label-md" style={{ color: color ?? 'var(--color-text-strong-950)' }}>{value}</span>
    </div>
  )
}

function CollaboratorCard({ m, rank }: { m: CollaboratorMetrics; rank: number }) {
  const uColor = utilizationColor(m.utilizationRate)

  return (
    <WidgetCard className="flex flex-col gap-5">

      {/* ── top row: rank + name + ring ── */}
      <div className="flex items-center gap-4">
        {/* rank number */}
        <span className="text-label-2xs w-4 shrink-0 tabular-nums">#{rank}</span>

        {/* color dot + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
            <span className="text-label-md truncate">{m.name}</span>
          </div>
          <p className="text-paragraph-xs ml-4.5">
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
        <div className="flex items-center gap-4 text-paragraph-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: '#1fc16b' }} />
            <span style={{ color: '#1fc16b' }} className="font-semibold">{m.productiveHours.toFixed(0)}h</span>
            <span>produtivas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: '#f6b51e' }} />
            <span style={{ color: '#f6b51e' }} className="font-semibold">{m.internalHours.toFixed(0)}h</span>
            <span>internas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: '#d1d1d1' }} />
            <span className="font-semibold">{m.idleHours.toFixed(0)}h</span>
            <span>ociosas</span>
          </span>
        </div>
      </div>

      {/* ── divider ── */}
      <div className="border-t border-stroke-soft-200" />

      {/* ── stats grid ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCell label="Custo" value={fmtBRL(m.totalCost)} color="#fb3748" />
        <StatCell label="Taxa/h" value={`${fmtBRL(m.effectiveHourlyRate)}/h`} color="#335cff" />
        <StatCell label="Ociosidade" value={`${(100 - m.utilizationRate).toFixed(1)}%`} color={m.idleHours > m.availableHours * 0.4 ? '#fb3748' : '#a3a3a3'} />
      </div>

    </WidgetCard>
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
    <>
      <PageHeader
        title="Colaboradores"
        subtitle={lastUpdated ? `Atualizado ${formatLastUpdated(lastUpdated)}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker start={start} end={end} onChange={handleRangeChange} />
            <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => setEditingRates(true)} title="Editar taxas e salários">
              <Button.Icon as={RiSettings3Line} />
              Editar taxas
            </Button.Root>
            <StudioPageActions loading={loading} onRefresh={() => fetchData(start, end, true)} />
          </div>
        }
      />

      <main className="flex flex-col gap-6 p-5">
        {loading && <DashboardSkeleton />}

        {!loading && error && (
          <div className="bg-bg-white-0 border border-stroke-soft-200 p-6 text-center">
            <p className="text-label-md mb-1">Erro ao carregar dados</p>
            <p className="text-paragraph-sm">{error}</p>
            <button
              onClick={() => fetchData(start, end)}
              className="mt-4 px-4 py-2 bg-bg-strong-950 text-text-white-0 text-sm hover:opacity-80 transition-opacity"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatWidget
                label="Utilização média"
                value={<span style={{ color: utilizationColor(avgUtilization) }}>{avgUtilization.toFixed(1)}%</span>}
                delta={`${metrics.length} colaborador${metrics.length !== 1 ? 'es' : ''}`}
              />
              <StatWidget
                label="Mais produtivo"
                value={mostProductive?.name ?? '—'}
                delta={mostProductive ? `${mostProductive.utilizationRate.toFixed(1)}% utilização` : undefined}
              />
              <StatWidget
                label="Horas ociosas"
                value={<span className="text-away-base">{totalIdleHours.toFixed(0)}h</span>}
                delta={`de ${totalAvailableHours.toFixed(0)}h disponíveis`}
                deltaVariant="warning"
              />
            </div>

            {/* ── period info + legend ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <p className="text-label-xs">
                {workingDays} dias úteis · {availableHoursPerPerson}h disponíveis/pessoa
              </p>
              <div className="flex items-center gap-4 text-paragraph-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block shrink-0" style={{ background: '#1fc16b' }} />
                  Produtivas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block shrink-0" style={{ background: '#f6b51e' }} />
                  Internas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block shrink-0" style={{ background: '#a3a3a3' }} />
                  Ociosas
                </span>
              </div>
            </div>

            {/* ── collaborator cards ── */}
            {sortedMetrics.length === 0 ? (
              <WidgetCard className="py-10 text-center">
                <p className="text-paragraph-sm text-text-sub-600">Nenhum colaborador encontrado no período.</p>
              </WidgetCard>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
    </>
  )
}
