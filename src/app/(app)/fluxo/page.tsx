'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Area,
} from 'recharts'
import { ChartGridLines, TOOLTIP_CARD, ACTIVE_DOT, CHART_TOKENS } from '@/components/charts/chart-primitives'
import OperationalCosts from '@/components/OperationalCosts'
import PageHeader from '@/components/shell/PageHeader'
import StudioPageActions from '@/components/studio/StudioPageActions'
import StatWidget from '@/components/ds/StatWidget'
import WidgetCard from '@/components/ds/WidgetCard'
import * as SegmentedControl from '@/components/ui/segmented-control'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthRow {
  month: string; label: string; isFuture: boolean
  cost: number; revenue: number; predictedRevenue: number; result: number
}

interface UpcomingEntry {
  id: string; name: string; value: number
  paymentDate: string; extractedName: string | null
}

interface OverdueEntry extends UpcomingEntry { daysOverdue: number }

interface HistoryEntry {
  id: string; name: string; value: number
  paymentDate: string; extractedName: string | null
}

interface CashflowData {
  monthly: MonthRow[]
  upcoming: UpcomingEntry[]
  overdue: OverdueEntry[]
  history: HistoryEntry[]
  summary: {
    totalRealized: number; totalCost: number; netBalance: number
    next3Forecast: number; avgMonthlyCost: number
    nextEntry: MonthRow | null; totalOverdue: number
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
}

function fmtMonthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTH_LABELS[m] ?? m} ${y}`
}

function fmtK(v: number) {
  return Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${Math.round(v)}`
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

const ChartTooltip = ({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => p.value !== 0)
  return (
    <div className={`${TOOLTIP_CARD} min-w-[200px] text-paragraph-sm`}>
      <p className="text-label-xs text-text-soft-400 mb-3">{label}</p>
      {items.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-paragraph-xs text-text-sub-600">{p.name}</span>
          </div>
          <span className="text-label-xs font-medium text-text-strong-950">
            {fmtBRL(Math.abs(p.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-stroke-soft-200 rounded ${className}`} />
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FluxoPage() {
  const [data, setData] = useState<CashflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scenario, setScenario] = useState<100 | 75 | 50>(100)
  const axisColor = 'var(--color-text-soft-400)'

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/cashflow')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `Erro ${res.status}`)
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const todayYM  = new Date().toISOString().slice(0, 7)
  const todayStr = new Date().toISOString().split('T')[0]
  const mult     = scenario / 100

  // Chart data
  const chartData = (data?.monthly ?? [])
    .filter((m) => m.revenue > 0 || m.predictedRevenue > 0 || m.cost > 0)
    .map((m) => ({
      ...m,
      realized: m.isFuture ? 0 : m.revenue,
      forecast: m.isFuture ? m.predictedRevenue * mult : 0,
      costLine: m.cost,
    }))

  // Cumulative balance
  let cumulative = 0
  const cumulativeData = chartData.map((m) => {
    cumulative += (m.isFuture ? m.forecast : m.realized) - m.costLine
    return { ...m, cumulative }
  })

  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  const { summary, upcoming = [], overdue = [], history = [] } = data ?? {}

  // Available months for filter
  const historyMonths = [...new Set(history.map((h) => h.paymentDate.slice(0, 7)))].sort().reverse()

  // Filtered + searched history
  const filteredHistory = history.filter((tx) => {
    if (monthFilter && !tx.paymentDate.startsWith(monthFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        tx.name.toLowerCase().includes(q) ||
        (tx.extractedName ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group by month
  const groupedHistory = filteredHistory.reduce<Record<string, HistoryEntry[]>>((acc, tx) => {
    const ym = tx.paymentDate.slice(0, 7)
    if (!acc[ym]) acc[ym] = []
    acc[ym].push(tx)
    return acc
  }, {})
  const lastPastLabel = [...chartData].reverse().find((d) => !d.isFuture)?.label

  const net = summary?.netBalance ?? 0
  const netPositive = net >= 0

  return (
    <>
      <PageHeader
        title="Fluxo de Caixa"
        subtitle="resultado acumulado do período"
        actions={
          <div className="flex items-center gap-2">
            <SegmentedControl.Root value={String(scenario)} onValueChange={(v) => setScenario(Number(v) as 100 | 75 | 50)}>
              <SegmentedControl.List>
                {([100, 75, 50] as const).map((s) => (
                  <SegmentedControl.Trigger key={s} value={String(s)}>
                    {s}%
                  </SegmentedControl.Trigger>
                ))}
              </SegmentedControl.List>
            </SegmentedControl.Root>
            <StudioPageActions loading={loading} onRefresh={load} />
          </div>
        }
      />

      <main className="flex flex-col gap-6 p-5">
        {error && (
          <WidgetCard className="border-error-light/40 bg-error-lighter/20">
            <p className="text-label-sm text-error-base">{error}</p>
          </WidgetCard>
        )}

        <StatWidget
          label="Resultado acumulado"
          value={
            loading ? '—' : (
              <span className={netPositive ? 'text-success-base' : 'text-error-base'}>{fmtBRL(net)}</span>
            )
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
            : [
                {
                  label: 'Previsto · próx. 3 meses',
                  value: summary && summary.next3Forecast > 0 ? fmtBRL(summary.next3Forecast * mult) : '—',
                  delta: scenario < 100 ? `Cenário ${scenario}%` : 'Cenário otimista',
                  variant: 'info' as const,
                },
                {
                  label: 'Receita realizada',
                  value: summary ? fmtBRL(summary.totalRealized) : '—',
                  delta: `custo ${summary ? fmtBRL(summary.totalCost) : '—'}`,
                  variant: 'success' as const,
                },
                {
                  label: 'Custo médio / mês',
                  value: summary && summary.avgMonthlyCost > 0 ? fmtBRL(summary.avgMonthlyCost) : '—',
                  delta: 'média últimos 3 meses',
                  variant: 'error' as const,
                },
                {
                  label: 'Em aberto · vencido',
                  value: summary && summary.totalOverdue > 0 ? fmtBRL(summary.totalOverdue) : '—',
                  delta: `${overdue.length} em atraso`,
                  variant: 'warning' as const,
                },
              ].map((k) => (
                <StatWidget
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  delta={k.delta}
                  deltaVariant={k.variant}
                />
              ))}
        </div>

        <WidgetCard className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-label-sm">Receita por mês</h2>
            <p className="text-paragraph-xs mt-0.5">
              Barras sólidas = realizado · claras = previsto · linha azul = saldo acumulado
            </p>
          </div>
          <div className="flex items-center gap-4 text-paragraph-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#1fc16b' }} />
              Realizado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border border-success-light" style={{ background: '#1fc16b18' }} />
              Previsto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px" style={{ background: '#fb3748', display: 'inline-block' }} />
              Custo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px" style={{ background: '#335cff', display: 'inline-block' }} />
              Acumulado
            </span>
          </div>
        </div>

        <div className="px-2 pb-6">
          {loading ? (
            <div className="h-72 flex items-center justify-center">
              <div className="space-y-3 w-full px-6">
                {[80, 60, 90, 50, 75, 65, 85].map((h, i) => (
                  <Skeleton key={i} className={`h-${h > 70 ? 8 : h > 55 ? 6 : 4} w-full`} />
                ))}
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center gap-2">
              <svg className="w-8 h-8 text-text-soft-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-paragraph-sm">Sem dados no período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cumulativeData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_TOKENS.info} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={CHART_TOKENS.info} stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <ChartGridLines />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false} tickLine={false} tickMargin={8}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={fmtK}
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false} tickLine={false}
                  width={52}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={fmtK}
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false} tickLine={false}
                  width={52}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'var(--color-bg-weak-50)' }}
                />

                {/* "Hoje" divider */}
                {lastPastLabel && cumulativeData.some((d) => d.isFuture) && (
                  <ReferenceLine
                    yAxisId="left"
                    x={lastPastLabel}
                    stroke="var(--color-stroke-sub-300)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    label={{ value: 'hoje', position: 'insideTopRight', fontSize: 10, fill: axisColor }}
                  />
                )}

                {/* Realized bars */}
                <Bar yAxisId="left" dataKey="realized" name="Realizado" maxBarSize={32} radius={[6, 6, 0, 0]}>
                  {cumulativeData.map((d, i) => (
                    <Cell key={i} fill={CHART_TOKENS.positive} fillOpacity={d.isFuture ? 0 : 0.9} />
                  ))}
                </Bar>

                {/* Forecast bars */}
                <Bar yAxisId="left" dataKey="forecast" name="Previsto" maxBarSize={32} radius={[6, 6, 0, 0]}>
                  {cumulativeData.map((_, i) => (
                    <Cell key={i} fill={CHART_TOKENS.positive} fillOpacity={0.18} stroke={CHART_TOKENS.positive} strokeWidth={1} />
                  ))}
                </Bar>

                {/* Cost line */}
                <Line
                  yAxisId="left"
                  dataKey="costLine"
                  name="Custo"
                  stroke={CHART_TOKENS.negative}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={ACTIVE_DOT(CHART_TOKENS.negative)}
                />

                {/* Cumulative area */}
                <Area
                  yAxisId="right"
                  type="linear"
                  dataKey="cumulative"
                  name="Saldo acumulado"
                  stroke={CHART_TOKENS.info}
                  strokeWidth={2}
                  fill="url(#gradCumulative)"
                  dot={false}
                  activeDot={ACTIVE_DOT(CHART_TOKENS.info)}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        </WidgetCard>

        <OperationalCosts months={Math.max(1, data?.monthly.filter(m => !m.isFuture).length ?? 1)} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Próximas entradas */}
        <WidgetCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-label-sm text-text-strong-950">Próximas entradas</h2>
              {!loading && upcoming.length > 0 && (
              <span className="rounded-full border px-2 py-0.5 text-label-2xs text-information-base" style={{ borderColor: '#335cff33', background: '#335cff0A' }}>
                  {upcoming.length} agendada{upcoming.length !== 1 ? 's' : ''}
                </span>
              )}
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 rounded-xl bg-bg-weak-50 px-4 py-3">
                  <div className="flex-1"><Skeleton className="h-3.5 w-40 mb-2" /><Skeleton className="h-2.5 w-24" /></div>
                  <div className="text-right"><Skeleton className="h-4 w-20 mb-1.5" /><Skeleton className="h-2.5 w-16" /></div>
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-xl bg-bg-weak-50 py-12 text-center">
              <svg className="w-7 h-7 mx-auto text-text-soft-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-paragraph-sm">Nenhuma entrada futura agendada</p>
              <p className="text-paragraph-xs mt-1 opacity-60">Lance transações com datas futuras no Notion</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {upcoming.map((tx) => {
                const ym = tx.paymentDate.slice(0, 7)
                const nextMonthYM = new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 7)
                const isNext = ym > todayYM && ym <= nextMonthYM
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-bg-weak-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-label-sm truncate">
                          {tx.extractedName ?? tx.name}
                        </p>
                        {isNext && (
                          <span className="shrink-0 text-label-2xs px-1.5 py-0.5"
                            style={{ color: '#335cff', background: '#335cff15' }}>
                            em breve
                          </span>
                        )}
                      </div>
                      {tx.extractedName && tx.extractedName !== tx.name && (
                        <p className="text-paragraph-xs truncate">{tx.name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-label-sm" style={{ color: '#1fc16b' }}>
                        {fmtBRL(tx.value * mult)}
                      </p>
                      <p className="text-paragraph-xs mt-0.5">{fmtDate(tx.paymentDate)}</p>
                    </div>
                  </div>
                )
              })}
              {/* Total */}
              <div className="mt-2 flex items-center justify-between rounded-xl bg-bg-weak-50 px-4 py-3">
                <p className="text-label-xs">Total previsto</p>
                <p className="text-label-sm" style={{ color: '#1fc16b' }}>
                  {fmtBRL(upcoming.reduce((s, t) => s + t.value, 0) * mult)}
                </p>
              </div>
            </div>
          )}
        </WidgetCard>

        {/* Em aberto */}
        <WidgetCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-label-sm text-text-strong-950">Em aberto · vencido</h2>
            {!loading && overdue.length > 0 && (
              <span className="rounded-full border px-2 py-0.5 text-label-2xs text-away-base" style={{ borderColor: '#f6b51e33', background: '#f6b51e0A' }}>
                {overdue.length} vencida{overdue.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 rounded-xl bg-bg-weak-50 px-4 py-3">
                  <div className="flex-1"><Skeleton className="mb-2 h-3.5 w-40" /><Skeleton className="h-2.5 w-20" /></div>
                  <div className="text-right"><Skeleton className="mb-1.5 h-4 w-20" /><Skeleton className="h-2.5 w-16" /></div>
                </div>
              ))}
            </div>
          ) : overdue.length === 0 ? (
            <div className="rounded-xl bg-bg-weak-50 py-12 text-center">
              <div className="mx-auto mb-3 flex size-7 items-center justify-center rounded-full bg-success-lighter">
                <svg className="size-4 text-success-base" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-label-sm text-success-base">Tudo em dia</p>
              <p className="mt-1 text-paragraph-xs text-text-sub-600">Nenhuma entrada vencida em aberto</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {overdue.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-bg-weak-50">
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate text-label-sm text-text-strong-950">{tx.extractedName ?? tx.name}</p>
                    <p className="text-paragraph-xs text-text-sub-600">{fmtDate(tx.paymentDate)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-label-sm text-away-base">{fmtBRL(tx.value)}</p>
                    <p className="mt-0.5 text-label-2xs text-error-base">{tx.daysOverdue}d em atraso</p>
                  </div>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between rounded-xl bg-bg-weak-50 px-4 py-3">
                <p className="text-label-xs text-text-sub-600">Total vencido</p>
                <p className="text-label-sm text-away-base">{fmtBRL(overdue.reduce((s, t) => s + t.value, 0))}</p>
              </div>
            </div>
          )}
        </WidgetCard>

        </div>

        <WidgetCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-label-sm text-text-strong-950">Histórico de pagamentos</h2>
              {!loading && (
                <p className="mt-0.5 text-paragraph-xs text-text-soft-400">
                  {filteredHistory.length} entrada{filteredHistory.length !== 1 ? 's' : ''} realizad{filteredHistory.length !== 1 ? 'as' : 'a'}
                  {search || monthFilter ? ' (filtrado)' : ''}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-soft-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar cliente…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-40 rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1.5 pl-8 pr-3 text-paragraph-xs text-text-strong-950 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)] placeholder:text-text-soft-400 focus:border-stroke-sub-300 focus:outline-none"
                />
              </div>

              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="cursor-pointer rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 text-paragraph-xs text-text-strong-950 focus:border-stroke-sub-300 focus:outline-none"
              >
                <option value="">Todos os meses</option>
                {historyMonths.map((ym) => (
                  <option key={ym} value={ym}>{fmtMonthLabel(ym)}</option>
                ))}
              </select>

              {(search || monthFilter) && (
                <button
                  onClick={() => { setSearch(''); setMonthFilter('') }}
                  className="rounded-lg border border-stroke-soft-200 px-2 py-1.5 text-xs text-text-soft-400 transition-colors hover:border-stroke-sub-300 hover:text-text-strong-950"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 rounded-xl bg-bg-weak-50 px-4 py-3">
                <div className="flex-1"><Skeleton className="mb-2 h-3.5 w-48" /><Skeleton className="h-2.5 w-24" /></div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-xl bg-bg-weak-50 py-12 text-center">
            <svg className="mx-auto mb-3 size-7 text-text-soft-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-paragraph-sm text-text-sub-600">Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(groupedHistory)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([ym, entries]) => {
                const monthTotal = entries.reduce((s, e) => s + e.value, 0)
                return (
                  <div key={ym}>
                    <div className="mb-2 flex items-center justify-between rounded-lg bg-bg-weak-50 px-4 py-2">
                      <p className="text-label-2xs text-text-sub-600">{fmtMonthLabel(ym)}</p>
                      <p className="text-label-2xs text-success-base">{fmtBRL(monthTotal)}</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      {entries.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-bg-weak-50">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-label-sm text-text-strong-950">{tx.extractedName ?? tx.name}</p>
                            {tx.extractedName && tx.extractedName !== tx.name && (
                              <p className="mt-0.5 truncate text-paragraph-xs text-text-sub-600">{tx.name}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-6">
                            <p className="text-paragraph-xs text-text-sub-600">{fmtDate(tx.paymentDate)}</p>
                            <p className="w-24 text-right text-label-sm text-success-base">{fmtBRL(tx.value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

            <div className="flex items-center justify-between rounded-xl bg-bg-weak-50 px-4 py-3">
              <p className="text-label-xs text-text-sub-600">Total {search || monthFilter ? 'filtrado' : 'realizado'}</p>
              <p className="text-label-md text-success-base">{fmtBRL(filteredHistory.reduce((s, t) => s + t.value, 0))}</p>
            </div>
          </div>
        )}
        </WidgetCard>
      </main>
    </>
  )
}
