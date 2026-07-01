'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Cell, Area,
} from 'recharts'
import { useTheme } from 'next-themes'
import OperationalCosts from '@/components/OperationalCosts'

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
    <div className="bg-bg-weak-50 border border-stroke-sub-300 shadow-xl p-4 text-paragraph-sm min-w-[200px]">
      <p className="text-label-xs mb-3">{label}</p>
      {items.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-paragraph-xs">{p.name}</span>
          </div>
          <span className="text-label-xs" style={{ color: p.color }}>
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
  const { theme } = useTheme()

  const isDark = theme === 'dark'
  const gridColor = isDark ? '#1E1E1E' : '#F0F0F0'
  const axisColor = isDark ? '#555' : '#999'

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
    <div className="min-h-screen p-6 lg:p-10 max-w-6xl">

      {/* ── Hero header ── */}
      <div className="flex items-start justify-between gap-6 mb-10">
        <div>
          <p className="text-label-xs mb-2">
            Fluxo de Caixa
          </p>
          {loading ? (
            <Skeleton className="h-12 w-56 mb-2" />
          ) : error ? (
            <p className="text-title-h4 text-error-base">Erro ao carregar</p>
          ) : (
            <p className="text-title-h3" style={{ color: netPositive ? '#1fc16b' : '#fb3748' }}>
              {fmtBRL(net)}
            </p>
          )}
          <p className="text-paragraph-sm mt-1">resultado acumulado do período</p>
        </div>

        <div className="flex items-center gap-3 shrink-0 mt-1">
          {/* Scenario pills */}
          <div className="flex items-center gap-1 bg-bg-white-0 border border-stroke-soft-200 p-0.5">
            {([100, 75, 50] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                  scenario === s
                    ? 'bg-bg-strong-950 text-text-white-0'
                    : 'text-text-soft-400 hover:text-text-strong-950'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-text-soft-400 border border-stroke-soft-200 px-3 py-2 hover:border-stroke-sub-300 hover:text-text-strong-950 transition-colors disabled:opacity-40"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-8 px-5 py-4 border text-label-sm" style={{ color: '#fb3748', borderColor: '#fb374833', background: '#fb374808' }}>
          {error}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stroke-soft-200 border border-stroke-soft-200 mb-8">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-bg-white-0 px-6 py-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        )) : [
          {
            label: 'Previsto · próx. 3 meses',
            value: summary && summary.next3Forecast > 0 ? fmtBRL(summary.next3Forecast * mult) : '—',
            color: '#335cff',
            sub: scenario < 100 ? `Cenário conservador ${scenario}%` : 'Cenário otimista',
          },
          {
            label: 'Receita realizada',
            value: summary ? fmtBRL(summary.totalRealized) : '—',
            color: '#1fc16b',
            sub: `custo ${summary ? fmtBRL(summary.totalCost) : '—'}`,
          },
          {
            label: 'Custo médio / mês',
            value: summary && summary.avgMonthlyCost > 0 ? fmtBRL(summary.avgMonthlyCost) : '—',
            color: '#fb3748',
            sub: 'média últimos 3 meses',
          },
          {
            label: 'Em aberto · vencido',
            value: summary && summary.totalOverdue > 0 ? fmtBRL(summary.totalOverdue) : '—',
            color: summary && summary.totalOverdue > 0 ? '#f6b51e' : '#a3a3a3',
            sub: `${overdue.length} entr${overdue.length !== 1 ? 'adas' : 'ada'} em atraso`,
          },
        ].map((k) => (
          <div key={k.label} className="bg-bg-white-0 px-6 py-5">
            <p className="text-label-2xs mb-3">{k.label}</p>
            <p className="text-title-h5" style={{ color: k.color }}>{k.value}</p>
            <p className="text-paragraph-xs mt-2">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div className="border border-stroke-soft-200 mb-8 bg-bg-white-0">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
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
                    <stop offset="5%" stopColor="#335cff" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#335cff" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false} tickLine={false}
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
                  cursor={{ fill: isDark ? '#ffffff05' : '#00000004' }}
                />

                {/* "Hoje" divider */}
                {lastPastLabel && cumulativeData.some((d) => d.isFuture) && (
                  <ReferenceLine
                    yAxisId="left"
                    x={lastPastLabel}
                    stroke={isDark ? '#333' : '#DDD'}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    label={{ value: 'hoje', position: 'insideTopRight', fontSize: 10, fill: axisColor }}
                  />
                )}

                {/* Realized bars */}
                <Bar yAxisId="left" dataKey="realized" name="Realizado" maxBarSize={32} radius={[3, 3, 0, 0]}>
                  {cumulativeData.map((d, i) => (
                    <Cell key={i} fill="#1fc16b" fillOpacity={d.isFuture ? 0 : 0.9} />
                  ))}
                </Bar>

                {/* Forecast bars */}
                <Bar yAxisId="left" dataKey="forecast" name="Previsto" maxBarSize={32} radius={[3, 3, 0, 0]}>
                  {cumulativeData.map((_, i) => (
                    <Cell key={i} fill="#1fc16b" fillOpacity={0.18} stroke="#1fc16b" strokeWidth={1} />
                  ))}
                </Bar>

                {/* Cost line */}
                <Line
                  yAxisId="left"
                  dataKey="costLine"
                  name="Custo"
                  stroke="#fb3748"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#fb3748', strokeWidth: 0 }}
                />

                {/* Cumulative area */}
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  name="Saldo acumulado"
                  stroke="#335cff"
                  strokeWidth={2}
                  fill="url(#gradCumulative)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#335cff', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Custos Operacionais ── */}
      <div className="mb-8">
        <OperationalCosts months={Math.max(1, data?.monthly.filter(m => !m.isFuture).length ?? 1)} />
      </div>

      {/* ── Upcoming + Overdue ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximas entradas */}
        <div className="border border-stroke-soft-200 bg-bg-white-0">
          <div className="px-6 py-5 border-b border-stroke-soft-200">
            <div className="flex items-center justify-between">
              <h2 className="text-label-sm">Próximas entradas</h2>
              {!loading && upcoming.length > 0 && (
                <span className="text-label-2xs px-2 py-0.5 border"
                  style={{ color: '#335cff', borderColor: '#335cff33', background: '#335cff0A' }}>
                  {upcoming.length} agendada{upcoming.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-[var(--color-stroke-soft-200)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1"><Skeleton className="h-3.5 w-40 mb-2" /><Skeleton className="h-2.5 w-24" /></div>
                  <div className="text-right"><Skeleton className="h-4 w-20 mb-1.5" /><Skeleton className="h-2.5 w-16" /></div>
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-7 h-7 mx-auto text-text-soft-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-paragraph-sm">Nenhuma entrada futura agendada</p>
              <p className="text-paragraph-xs mt-1 opacity-60">Lance transações com datas futuras no Notion</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-stroke-soft-200)]">
              {upcoming.map((tx) => {
                const ym = tx.paymentDate.slice(0, 7)
                const nextMonthYM = new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 7)
                const isNext = ym > todayYM && ym <= nextMonthYM
                return (
                  <div key={tx.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-bg-weak-50 transition-colors">
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
              <div className="px-6 py-4 flex items-center justify-between bg-bg-weak-50">
                <p className="text-label-xs">Total previsto</p>
                <p className="text-label-sm" style={{ color: '#1fc16b' }}>
                  {fmtBRL(upcoming.reduce((s, t) => s + t.value, 0) * mult)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Em aberto */}
        <div className="border border-stroke-soft-200 bg-bg-white-0">
          <div className="px-6 py-5 border-b border-stroke-soft-200">
            <div className="flex items-center justify-between">
              <h2 className="text-label-sm">Em aberto · vencido</h2>
              {!loading && overdue.length > 0 && (
                <span className="text-label-2xs px-2 py-0.5 border"
                  style={{ color: '#f6b51e', borderColor: '#f6b51e33', background: '#f6b51e0A' }}>
                  {overdue.length} vencida{overdue.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-[var(--color-stroke-soft-200)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1"><Skeleton className="h-3.5 w-40 mb-2" /><Skeleton className="h-2.5 w-20" /></div>
                  <div className="text-right"><Skeleton className="h-4 w-20 mb-1.5" /><Skeleton className="h-2.5 w-16" /></div>
                </div>
              ))}
            </div>
          ) : overdue.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-7 h-7 mx-auto mb-3 flex items-center justify-center rounded-full" style={{ background: '#1fc16b18' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#1fc16b" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-label-sm" style={{ color: '#1fc16b' }}>Tudo em dia</p>
              <p className="text-paragraph-xs mt-1 opacity-60">Nenhuma entrada vencida em aberto</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-stroke-soft-200)]">
              {overdue.map((tx) => (
                <div key={tx.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-bg-weak-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-label-sm truncate mb-0.5">
                      {tx.extractedName ?? tx.name}
                    </p>
                    <p className="text-paragraph-xs">{fmtDate(tx.paymentDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-label-sm" style={{ color: '#f6b51e' }}>{fmtBRL(tx.value)}</p>
                    <p className="text-label-2xs mt-0.5" style={{ color: '#fb3748' }}>
                      {tx.daysOverdue}d em atraso
                    </p>
                  </div>
                </div>
              ))}
              <div className="px-6 py-4 flex items-center justify-between bg-bg-weak-50">
                <p className="text-label-xs">Total vencido</p>
                <p className="text-label-sm" style={{ color: '#f6b51e' }}>
                  {fmtBRL(overdue.reduce((s, t) => s + t.value, 0))}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Histórico de pagamentos ── */}
      <div className="mt-6 border border-stroke-soft-200 bg-bg-white-0">

        {/* Header + filters */}
        <div className="px-6 py-5 border-b border-stroke-soft-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-label-sm">Histórico de pagamentos</h2>
              {!loading && (
                <p className="text-paragraph-xs mt-0.5">
                  {filteredHistory.length} entrada{filteredHistory.length !== 1 ? 's' : ''} realizad{filteredHistory.length !== 1 ? 'as' : 'a'}
                  {search || monthFilter ? ' (filtrado)' : ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar cliente…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-paragraph-xs bg-bg-weak-50 border border-stroke-soft-200 placeholder-[var(--color-text-soft-400)] focus:outline-none focus:border-stroke-sub-300 w-40"
                />
              </div>

              {/* Month filter */}
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="text-paragraph-xs bg-bg-weak-50 border border-stroke-soft-200 px-2.5 py-1.5 focus:outline-none focus:border-stroke-sub-300 cursor-pointer"
              >
                <option value="">Todos os meses</option>
                {historyMonths.map((ym) => (
                  <option key={ym} value={ym}>{fmtMonthLabel(ym)}</option>
                ))}
              </select>

              {/* Clear filters */}
              {(search || monthFilter) && (
                <button
                  onClick={() => { setSearch(''); setMonthFilter('') }}
                  className="text-xs text-text-soft-400 hover:text-text-strong-950 transition-colors px-2 py-1.5 border border-stroke-soft-200 hover:border-stroke-sub-300"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="divide-y divide-[var(--color-stroke-soft-200)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1"><Skeleton className="h-3.5 w-48 mb-2" /><Skeleton className="h-2.5 w-24" /></div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-7 h-7 mx-auto text-text-soft-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-paragraph-sm">Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedHistory)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([ym, entries]) => {
                const monthTotal = entries.reduce((s, e) => s + e.value, 0)
                return (
                  <div key={ym}>
                    {/* Month header */}
                    <div className="px-6 py-2.5 flex items-center justify-between bg-bg-weak-50 border-y border-stroke-soft-200">
                      <p className="text-label-2xs">
                        {fmtMonthLabel(ym)}
                      </p>
                      <p className="text-label-2xs" style={{ color: '#1fc16b' }}>
                        {fmtBRL(monthTotal)}
                      </p>
                    </div>

                    {/* Entries */}
                    <div className="divide-y divide-[var(--color-stroke-soft-200)]">
                      {entries.map((tx) => (
                        <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-bg-weak-50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-label-sm truncate">
                              {tx.extractedName ?? tx.name}
                            </p>
                            {tx.extractedName && tx.extractedName !== tx.name && (
                              <p className="text-paragraph-xs truncate mt-0.5">{tx.name}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-6">
                            <p className="text-paragraph-xs">{fmtDate(tx.paymentDate)}</p>
                            <p className="text-label-sm w-24 text-right" style={{ color: '#1fc16b' }}>
                              {fmtBRL(tx.value)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

            {/* Grand total */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-stroke-soft-200 bg-bg-weak-50">
              <p className="text-label-xs">
                Total {search || monthFilter ? 'filtrado' : 'realizado'}
              </p>
              <p className="text-label-md" style={{ color: '#1fc16b' }}>
                {fmtBRL(filteredHistory.reduce((s, t) => s + t.value, 0))}
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
