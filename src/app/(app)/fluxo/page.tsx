'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Cell, Area,
} from 'recharts'
import { useTheme } from 'next-themes'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthRow {
  month: string; label: string; isFuture: boolean
  cost: number; revenue: number; predictedRevenue: number; result: number
}

interface UpcomingEntry {
  id: string; name: string; value: number; predictedValue: number
  paymentDate: string; extractedName: string | null
}

interface OverdueEntry extends UpcomingEntry { daysOverdue: number }

interface CashflowData {
  monthly: MonthRow[]
  upcoming: UpcomingEntry[]
  overdue: OverdueEntry[]
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

function fmtK(v: number) {
  return Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${Math.round(v)}`
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const ChartTooltip = ({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)] p-3 text-sm min-w-[190px]">
      <p className="font-semibold text-[var(--tx)] mb-2">{label}</p>
      {payload.map((p) => p.value !== 0 && (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-[var(--tx3)] text-xs">{p.name}</span>
          </div>
          <span className="font-semibold text-xs" style={{ color: p.color }}>
            {fmtBRL(Math.abs(p.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function FluxoPage() {
  const [data, setData] = useState<CashflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scenario, setScenario] = useState<100 | 75 | 50>(100)
  const { theme } = useTheme()

  const isDark = theme === 'dark'
  const gridColor  = isDark ? '#222' : '#E8E8E8'
  const axisColor  = isDark ? '#666' : '#888'

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/cashflow')
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const todayYM = new Date().toISOString().slice(0, 7)

  // Apply scenario multiplier to predicted revenue
  const mult = scenario / 100

  const chartData = (data?.monthly ?? [])
    .filter((m) => m.revenue > 0 || m.predictedRevenue > 0 || m.cost > 0)
    .map((m) => ({
      ...m,
      realized:  m.isFuture ? 0 : m.revenue,
      forecast:  m.isFuture ? m.predictedRevenue * mult : 0,
      costLine:  m.cost,
    }))

  // Cumulative balance line (realized - cost, month by month)
  let cumulative = 0
  const cumulativeData = chartData.map((m) => {
    const rev = m.isFuture ? m.forecast : m.realized
    cumulative += rev - m.costLine
    return { ...m, cumulative }
  })

  const { summary, upcoming = [], overdue = [] } = data ?? {}

  // "Hoje" reference label index
  const lastPastLabel = [...chartData].reverse().find((d) => !d.isFuture)?.label

  return (
    <div className="p-6 lg:p-8 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--tx)]">Fluxo de Caixa</h1>
          <p className="text-sm text-[var(--tx3)] mt-1">
            Receita realizada + previsão de entradas futuras do Notion
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-medium text-[var(--tx3)] border border-[var(--bd)] px-3 py-2 hover:border-[var(--bd3)] hover:text-[var(--tx)] transition-colors disabled:opacity-40"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Carregando…' : 'Atualizar'}
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 border text-sm" style={{ color: '#F87171', borderColor: '#F8717144', background: '#F8717110' }}>
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--bd)] border border-[var(--bd)] mb-8">
          {[
            {
              label: 'Resultado acumulado',
              value: fmtBRL(summary.netBalance),
              color: summary.netBalance >= 0 ? '#22C55E' : '#F87171',
              sub: `${fmtBRL(summary.totalRealized)} receita · ${fmtBRL(summary.totalCost)} custo`,
            },
            {
              label: 'Previsto próx. 3 meses',
              value: summary.next3Forecast > 0 ? fmtBRL(summary.next3Forecast * mult) : '—',
              color: '#60A5FA',
              sub: scenario < 100 ? `Cenário ${scenario}%` : 'Otimista (100%)',
            },
            {
              label: 'Custo médio mensal',
              value: summary.avgMonthlyCost > 0 ? fmtBRL(summary.avgMonthlyCost) : '—',
              color: '#F87171',
              sub: 'média últimos 3 meses',
            },
            {
              label: 'Em aberto (vencido)',
              value: summary.totalOverdue > 0 ? fmtBRL(summary.totalOverdue) : '—',
              color: summary.totalOverdue > 0 ? '#FBBF24' : '#9CA3AF',
              sub: `${overdue.length} entrada${overdue.length !== 1 ? 's' : ''} vencida${overdue.length !== 1 ? 's' : ''}`,
            },
          ].map((k) => (
            <div key={k.label} className="bg-[var(--bg3)] px-6 py-5">
              <p className="text-xs text-[var(--tx3)] mb-1">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[11px] text-[var(--tx3)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Cashflow Chart ── */}
      <div className="bg-[var(--bg3)] border border-[var(--bd)] mb-8">
        <div className="px-6 py-4 border-b border-[var(--bd)] flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-[var(--tx)]">Receita por mês</h2>
            <p className="text-xs text-[var(--tx3)] mt-0.5">Barras verdes = realizado · claras = previsto · linha cinza = saldo acumulado</p>
          </div>
          {/* Scenario selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[var(--tx3)] mr-1">Cenário:</span>
            {([100, 75, 50] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-2.5 py-1 border font-medium transition-colors ${
                  scenario === s
                    ? 'border-[var(--inv)] bg-[var(--inv)] text-[var(--inv-tx)]'
                    : 'border-[var(--bd)] text-[var(--tx3)] hover:text-[var(--tx)]'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-[var(--tx3)]">Carregando…</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-[var(--tx3)]">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={cumulativeData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tickFormatter={fmtK} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={fmtK} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? '#ffffff06' : '#00000005' }} />

                {lastPastLabel && (
                  <ReferenceLine
                    yAxisId="left"
                    x={lastPastLabel}
                    stroke={isDark ? '#444' : '#CCC'}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    label={{ value: 'hoje', position: 'insideTopRight', fontSize: 10, fill: axisColor }}
                  />
                )}

                {/* Realized revenue */}
                <Bar yAxisId="left" dataKey="realized" name="Realizado" maxBarSize={36} radius={[3, 3, 0, 0]}>
                  {cumulativeData.map((d, i) => (
                    <Cell key={i} fill="#22C55E" fillOpacity={d.isFuture ? 0 : 1} />
                  ))}
                </Bar>

                {/* Forecast revenue */}
                <Bar yAxisId="left" dataKey="forecast" name="Previsto" maxBarSize={36} radius={[3, 3, 0, 0]}>
                  {cumulativeData.map((_, i) => (
                    <Cell key={i} fill="#22C55E" fillOpacity={0.2} stroke="#22C55E" strokeWidth={1} />
                  ))}
                </Bar>

                {/* Cost line */}
                <Line yAxisId="left" dataKey="costLine" name="Custo" stroke="#F87171" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F87171', strokeWidth: 0 }} />

                {/* Cumulative balance */}
                <Area yAxisId="right" type="monotone" dataKey="cumulative" name="Saldo acumulado"
                  stroke="#60A5FA" strokeWidth={1.5} fill="#60A5FA" fillOpacity={0.05}
                  dot={false} activeDot={{ r: 3, fill: '#60A5FA', strokeWidth: 0 }}
                  strokeDasharray="0"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Two-column: Upcoming + Overdue ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Próximas entradas */}
        <div className="bg-[var(--bg3)] border border-[var(--bd)]">
          <div className="px-6 py-4 border-b border-[var(--bd)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--tx)]">Próximas entradas</h2>
            {upcoming.length > 0 && (
              <span className="text-xs text-[var(--tx3)]">{upcoming.length} agendada{upcoming.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-8 text-sm text-[var(--tx3)] text-center">Carregando…</div>
          ) : upcoming.length === 0 ? (
            <div className="px-6 py-8 text-sm text-[var(--tx3)] text-center">
              Nenhuma entrada futura agendada.<br />
              <span className="text-xs">Lance transações com datas futuras no Notion.</span>
            </div>
          ) : (
            <div className="divide-y divide-[var(--bd)]">
              {upcoming.map((tx) => {
                const ym = tx.paymentDate.slice(0, 7)
                const isNextMonth = ym > todayYM && ym <= new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 7)
                return (
                  <div key={tx.id} className="px-6 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--tx)] truncate">
                          {tx.extractedName ?? tx.name}
                        </p>
                        {isNextMonth && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 font-semibold border"
                            style={{ color: '#60A5FA', borderColor: '#60A5FA44', background: '#60A5FA0D' }}>
                            em breve
                          </span>
                        )}
                      </div>
                      {tx.extractedName && tx.extractedName !== tx.name && (
                        <p className="text-xs text-[var(--tx3)] truncate">{tx.name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: '#22C55E' }}>{fmtBRL(tx.value * mult)}</p>
                      <p className="text-xs text-[var(--tx3)]">{fmtDate(tx.paymentDate)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Entradas vencidas */}
        <div className="bg-[var(--bg3)] border border-[var(--bd)]">
          <div className="px-6 py-4 border-b border-[var(--bd)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--tx)]">Em aberto (vencido)</h2>
            {overdue.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 border"
                style={{ color: '#FBBF24', borderColor: '#FBBF2444', background: '#FBBF2410' }}>
                {overdue.length} vencida{overdue.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-8 text-sm text-[var(--tx3)] text-center">Carregando…</div>
          ) : overdue.length === 0 ? (
            <div className="px-6 py-8 text-sm text-center" style={{ color: '#22C55E' }}>
              ✓ Nenhuma entrada vencida em aberto
            </div>
          ) : (
            <div className="divide-y divide-[var(--bd)]">
              {overdue.map((tx) => (
                <div key={tx.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--tx)] truncate">
                      {tx.extractedName ?? tx.name}
                    </p>
                    <p className="text-xs text-[var(--tx3)]">{fmtDate(tx.paymentDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#FBBF24' }}>{fmtBRL(tx.value)}</p>
                    <p className="text-xs" style={{ color: '#F87171' }}>
                      {tx.daysOverdue}d em atraso
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
