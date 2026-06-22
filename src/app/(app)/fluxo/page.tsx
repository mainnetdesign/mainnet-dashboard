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
    <div className="bg-[var(--bg)] border border-[var(--bd3)] shadow-xl p-4 text-sm min-w-[200px]">
      <p className="text-xs font-semibold text-[var(--tx3)] uppercase tracking-wider mb-3">{label}</p>
      {items.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-[var(--tx2)] text-xs">{p.name}</span>
          </div>
          <span className="font-bold text-xs" style={{ color: p.color }}>
            {fmtBRL(Math.abs(p.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--bd)] rounded ${className}`} />
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
          <p className="text-xs font-semibold text-[var(--tx3)] uppercase tracking-[0.15em] mb-2">
            Fluxo de Caixa
          </p>
          {loading ? (
            <Skeleton className="h-12 w-56 mb-2" />
          ) : error ? (
            <p className="text-3xl font-bold text-[#F87171]">Erro ao carregar</p>
          ) : (
            <p className="text-4xl font-bold tracking-tight" style={{ color: netPositive ? '#22C55E' : '#F87171' }}>
              {fmtBRL(net)}
            </p>
          )}
          <p className="text-sm text-[var(--tx3)] mt-1">resultado acumulado do período</p>
        </div>

        <div className="flex items-center gap-3 shrink-0 mt-1">
          {/* Scenario pills */}
          <div className="flex items-center gap-1 bg-[var(--bg3)] border border-[var(--bd)] p-0.5">
            {([100, 75, 50] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                  scenario === s
                    ? 'bg-[var(--inv)] text-[var(--inv-tx)]'
                    : 'text-[var(--tx3)] hover:text-[var(--tx)]'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--tx3)] border border-[var(--bd)] px-3 py-2 hover:border-[var(--bd3)] hover:text-[var(--tx)] transition-colors disabled:opacity-40"
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
        <div className="mb-8 px-5 py-4 border text-sm font-medium" style={{ color: '#F87171', borderColor: '#F8717133', background: '#F8717108' }}>
          {error}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--bd)] border border-[var(--bd)] mb-8">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[var(--bg3)] px-6 py-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        )) : [
          {
            label: 'Previsto · próx. 3 meses',
            value: summary && summary.next3Forecast > 0 ? fmtBRL(summary.next3Forecast * mult) : '—',
            color: '#60A5FA',
            sub: scenario < 100 ? `Cenário conservador ${scenario}%` : 'Cenário otimista',
          },
          {
            label: 'Receita realizada',
            value: summary ? fmtBRL(summary.totalRealized) : '—',
            color: '#22C55E',
            sub: `custo ${summary ? fmtBRL(summary.totalCost) : '—'}`,
          },
          {
            label: 'Custo médio / mês',
            value: summary && summary.avgMonthlyCost > 0 ? fmtBRL(summary.avgMonthlyCost) : '—',
            color: '#F87171',
            sub: 'média últimos 3 meses',
          },
          {
            label: 'Em aberto · vencido',
            value: summary && summary.totalOverdue > 0 ? fmtBRL(summary.totalOverdue) : '—',
            color: summary && summary.totalOverdue > 0 ? '#FBBF24' : '#9CA3AF',
            sub: `${overdue.length} entr${overdue.length !== 1 ? 'adas' : 'ada'} em atraso`,
          },
        ].map((k) => (
          <div key={k.label} className="bg-[var(--bg3)] px-6 py-5">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-3">{k.label}</p>
            <p className="text-2xl font-bold tracking-tight" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-[var(--tx3)] mt-2">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div className="border border-[var(--bd)] mb-8 bg-[var(--bg3)]">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-[var(--tx)] tracking-tight">Receita por mês</h2>
            <p className="text-xs text-[var(--tx3)] mt-0.5">
              Barras sólidas = realizado · claras = previsto · linha azul = saldo acumulado
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[var(--tx3)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#22C55E' }} />
              Realizado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border border-[#22C55E66]" style={{ background: '#22C55E18' }} />
              Previsto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px" style={{ background: '#F87171', display: 'inline-block' }} />
              Custo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px" style={{ background: '#60A5FA', display: 'inline-block' }} />
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
              <svg className="w-8 h-8 text-[var(--bd3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-[var(--tx3)]">Sem dados no período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cumulativeData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.01} />
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
                    <Cell key={i} fill="#22C55E" fillOpacity={d.isFuture ? 0 : 0.9} />
                  ))}
                </Bar>

                {/* Forecast bars */}
                <Bar yAxisId="left" dataKey="forecast" name="Previsto" maxBarSize={32} radius={[3, 3, 0, 0]}>
                  {cumulativeData.map((_, i) => (
                    <Cell key={i} fill="#22C55E" fillOpacity={0.18} stroke="#22C55E" strokeWidth={1} />
                  ))}
                </Bar>

                {/* Cost line */}
                <Line
                  yAxisId="left"
                  dataKey="costLine"
                  name="Custo"
                  stroke="#F87171"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#F87171', strokeWidth: 0 }}
                />

                {/* Cumulative area */}
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  name="Saldo acumulado"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  fill="url(#gradCumulative)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#60A5FA', strokeWidth: 0 }}
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
        <div className="border border-[var(--bd)] bg-[var(--bg3)]">
          <div className="px-6 py-5 border-b border-[var(--bd)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--tx)]">Próximas entradas</h2>
              {!loading && upcoming.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 border"
                  style={{ color: '#60A5FA', borderColor: '#60A5FA33', background: '#60A5FA0A' }}>
                  {upcoming.length} agendada{upcoming.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-[var(--bd)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1"><Skeleton className="h-3.5 w-40 mb-2" /><Skeleton className="h-2.5 w-24" /></div>
                  <div className="text-right"><Skeleton className="h-4 w-20 mb-1.5" /><Skeleton className="h-2.5 w-16" /></div>
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-7 h-7 mx-auto text-[var(--bd3)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-[var(--tx3)]">Nenhuma entrada futura agendada</p>
              <p className="text-xs text-[var(--tx3)] mt-1 opacity-60">Lance transações com datas futuras no Notion</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--bd)]">
              {upcoming.map((tx) => {
                const ym = tx.paymentDate.slice(0, 7)
                const nextMonthYM = new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 7)
                const isNext = ym > todayYM && ym <= nextMonthYM
                return (
                  <div key={tx.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[var(--bg4)] transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-[var(--tx)] truncate">
                          {tx.extractedName ?? tx.name}
                        </p>
                        {isNext && (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide"
                            style={{ color: '#60A5FA', background: '#60A5FA15' }}>
                            em breve
                          </span>
                        )}
                      </div>
                      {tx.extractedName && tx.extractedName !== tx.name && (
                        <p className="text-xs text-[var(--tx3)] truncate">{tx.name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: '#22C55E' }}>
                        {fmtBRL(tx.value * mult)}
                      </p>
                      <p className="text-xs text-[var(--tx3)] mt-0.5">{fmtDate(tx.paymentDate)}</p>
                    </div>
                  </div>
                )
              })}
              {/* Total */}
              <div className="px-6 py-4 flex items-center justify-between bg-[var(--bg4)]">
                <p className="text-xs font-semibold text-[var(--tx3)] uppercase tracking-wider">Total previsto</p>
                <p className="text-sm font-bold" style={{ color: '#22C55E' }}>
                  {fmtBRL(upcoming.reduce((s, t) => s + t.value, 0) * mult)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Em aberto */}
        <div className="border border-[var(--bd)] bg-[var(--bg3)]">
          <div className="px-6 py-5 border-b border-[var(--bd)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--tx)]">Em aberto · vencido</h2>
              {!loading && overdue.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 border"
                  style={{ color: '#FBBF24', borderColor: '#FBBF2433', background: '#FBBF240A' }}>
                  {overdue.length} vencida{overdue.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-[var(--bd)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1"><Skeleton className="h-3.5 w-40 mb-2" /><Skeleton className="h-2.5 w-20" /></div>
                  <div className="text-right"><Skeleton className="h-4 w-20 mb-1.5" /><Skeleton className="h-2.5 w-16" /></div>
                </div>
              ))}
            </div>
          ) : overdue.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-7 h-7 mx-auto mb-3 flex items-center justify-center rounded-full" style={{ background: '#22C55E18' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#22C55E" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#22C55E' }}>Tudo em dia</p>
              <p className="text-xs text-[var(--tx3)] mt-1 opacity-60">Nenhuma entrada vencida em aberto</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--bd)]">
              {overdue.map((tx) => (
                <div key={tx.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[var(--bg4)] transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--tx)] truncate mb-0.5">
                      {tx.extractedName ?? tx.name}
                    </p>
                    <p className="text-xs text-[var(--tx3)]">{fmtDate(tx.paymentDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#FBBF24' }}>{fmtBRL(tx.value)}</p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#F87171' }}>
                      {tx.daysOverdue}d em atraso
                    </p>
                  </div>
                </div>
              ))}
              <div className="px-6 py-4 flex items-center justify-between bg-[var(--bg4)]">
                <p className="text-xs font-semibold text-[var(--tx3)] uppercase tracking-wider">Total vencido</p>
                <p className="text-sm font-bold" style={{ color: '#FBBF24' }}>
                  {fmtBRL(overdue.reduce((s, t) => s + t.value, 0))}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Histórico de pagamentos ── */}
      <div className="mt-6 border border-[var(--bd)] bg-[var(--bg3)]">

        {/* Header + filters */}
        <div className="px-6 py-5 border-b border-[var(--bd)]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-[var(--tx)]">Histórico de pagamentos</h2>
              {!loading && (
                <p className="text-xs text-[var(--tx3)] mt-0.5">
                  {filteredHistory.length} entrada{filteredHistory.length !== 1 ? 's' : ''} realizad{filteredHistory.length !== 1 ? 'as' : 'a'}
                  {search || monthFilter ? ' (filtrado)' : ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--tx3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar cliente…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--tx)] placeholder-[var(--tx3)] focus:outline-none focus:border-[var(--bd3)] w-40"
                />
              </div>

              {/* Month filter */}
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="text-xs bg-[var(--bg)] border border-[var(--bd)] text-[var(--tx)] px-2.5 py-1.5 focus:outline-none focus:border-[var(--bd3)] cursor-pointer"
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
                  className="text-xs text-[var(--tx3)] hover:text-[var(--tx)] transition-colors px-2 py-1.5 border border-[var(--bd)] hover:border-[var(--bd3)]"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="divide-y divide-[var(--bd)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1"><Skeleton className="h-3.5 w-48 mb-2" /><Skeleton className="h-2.5 w-24" /></div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-7 h-7 mx-auto text-[var(--bd3)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-[var(--tx3)]">Nenhum pagamento encontrado</p>
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
                    <div className="px-6 py-2.5 flex items-center justify-between bg-[var(--bg4)] border-y border-[var(--bd)]">
                      <p className="text-[11px] font-bold text-[var(--tx3)] uppercase tracking-wider">
                        {fmtMonthLabel(ym)}
                      </p>
                      <p className="text-[11px] font-bold" style={{ color: '#22C55E' }}>
                        {fmtBRL(monthTotal)}
                      </p>
                    </div>

                    {/* Entries */}
                    <div className="divide-y divide-[var(--bd)]">
                      {entries.map((tx) => (
                        <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--bg4)] transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[var(--tx)] truncate">
                              {tx.extractedName ?? tx.name}
                            </p>
                            {tx.extractedName && tx.extractedName !== tx.name && (
                              <p className="text-xs text-[var(--tx3)] truncate mt-0.5">{tx.name}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-6">
                            <p className="text-xs text-[var(--tx3)]">{fmtDate(tx.paymentDate)}</p>
                            <p className="text-sm font-bold w-24 text-right" style={{ color: '#22C55E' }}>
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
            <div className="px-6 py-4 flex items-center justify-between border-t border-[var(--bd)] bg-[var(--bg4)]">
              <p className="text-xs font-bold text-[var(--tx3)] uppercase tracking-wider">
                Total {search || monthFilter ? 'filtrado' : 'realizado'}
              </p>
              <p className="text-base font-bold" style={{ color: '#22C55E' }}>
                {fmtBRL(filteredHistory.reduce((s, t) => s + t.value, 0))}
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
