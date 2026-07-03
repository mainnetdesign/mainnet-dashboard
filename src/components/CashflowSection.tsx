'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { MonthlyData } from '@/types'
import { ChartGridLines, TOOLTIP_CARD, ACTIVE_DOT, CHART_TOKENS } from '@/components/charts/chart-primitives'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

function fmtK(v: number) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`
  return `R$${Math.round(v)}`
}

interface Props { data: MonthlyData[] }

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className={`${TOOLTIP_CARD} min-w-[180px] text-paragraph-sm`}>
      <p className="mb-2 text-label-xs text-text-soft-400">{label}</p>
      {payload.map((p) => (
        p.value !== 0 && (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-paragraph-xs">{p.name}</span>
            </div>
            <span className="text-label-xs" style={{ color: p.color }}>
              {fmtBRL(Math.abs(p.value))}
            </span>
          </div>
        )
      ))}
    </div>
  )
}

export default function CashflowSection({ data }: Props) {

  const todayYM = new Date().toISOString().slice(0, 7)

  // Average cost of last 3 realized months (to project future cost)
  const pastMonths = data.filter((m) => m.month <= todayYM && m.cost > 0)
  const last3 = pastMonths.slice(-3)
  const avgCost = last3.length > 0
    ? last3.reduce((s, m) => s + m.cost, 0) / last3.length
    : 0

  // Build chart data — include past + future months that have any data
  const chartData = data
    .filter((m) => m.revenue > 0 || m.predictedRevenue > 0 || m.cost > 0)
    .map((m) => {
      const isFuture = m.month > todayYM
      return {
        label: m.label,
        month: m.month,
        isFuture,
        realized: isFuture ? 0 : m.revenue,
        forecast: isFuture ? m.predictedRevenue : 0,
        cost: isFuture ? avgCost : m.cost,
      }
    })

  // KPIs
  const totalRealized   = data.filter((m) => m.month <= todayYM).reduce((s, m) => s + m.revenue, 0)
  const totalCost       = data.filter((m) => m.month <= todayYM).reduce((s, m) => s + m.cost, 0)
  const netBalance      = totalRealized - totalCost

  const futureMonths    = data.filter((m) => m.month > todayYM && m.predictedRevenue > 0)
  const next3Forecast   = futureMonths.slice(0, 3).reduce((s, m) => s + m.predictedRevenue, 0)
  const nextMonthEntry  = futureMonths[0]

  const axisColor = 'var(--color-text-soft-400)'

  const kpis = [
    {
      label: 'Resultado acumulado',
      value: fmtBRL(netBalance),
      color: netBalance >= 0 ? 'var(--color-success-base)' : 'var(--color-error-base)',
      sub: `${fmtBRL(totalRealized)} receita · ${fmtBRL(totalCost)} custo`,
    },
    {
      label: 'Próxima entrada prevista',
      value: nextMonthEntry ? fmtBRL(nextMonthEntry.predictedRevenue) : '—',
      color: 'var(--color-information-base)',
      sub: nextMonthEntry ? nextMonthEntry.label : 'Nenhum agendamento',
    },
    {
      label: 'Previsão próximos 3 meses',
      value: next3Forecast > 0 ? fmtBRL(next3Forecast) : '—',
      color: 'var(--color-away-base)',
      sub: futureMonths.slice(0, 3).map((m) => m.label).join(' · ') || 'Sem previsão',
    },
    {
      label: 'Custo projetado (média 3m)',
      value: avgCost > 0 ? fmtBRL(avgCost) : '—',
      color: 'var(--color-error-base)',
      sub: 'por mês estimado',
    },
  ]

  if (chartData.length === 0) return null

  return (
    <div className="bg-bg-white-0 border border-stroke-soft-200 mb-8">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stroke-soft-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-label-md">Fluxo de Caixa</h2>
            <p className="text-paragraph-sm mt-0.5">
              Realizado vs previsto · barras escuras = confirmado · barras claras = agendado
            </p>
          </div>
          <div className="flex items-center gap-4 text-paragraph-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--color-success-base)' }} />
              Realizado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border" style={{ background: '#1fc16b22', borderColor: '#1fc16b66' }} />
              Previsto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5" style={{ background: 'var(--color-error-base)' }} />
              Custo
            </span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--color-stroke-soft-200)] border-b border-stroke-soft-200">
        {kpis.map((k) => (
          <div key={k.label} className="px-6 py-4">
            <p className="text-paragraph-xs mb-1">{k.label}</p>
            <p className="text-title-h6" style={{ color: k.color }}>{k.value}</p>
            <p className="text-paragraph-xs mt-1 truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <ChartGridLines />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false} tickLine={false} tickMargin={8}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-weak-50)' }} />

            {/* "Hoje" divider */}
            {chartData.some((d) => d.isFuture) && chartData.some((d) => !d.isFuture) && (() => {
              const lastPastIdx = chartData.findLastIndex((d) => !d.isFuture)
              const lastPastLabel = chartData[lastPastIdx]?.label
              return lastPastLabel ? (
                <ReferenceLine
                  x={lastPastLabel}
                  stroke="var(--color-stroke-sub-300)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  label={{ value: 'hoje', position: 'insideTopRight', fontSize: 10, fill: axisColor }}
                />
              ) : null
            })()}

            {/* Realized revenue — solid green */}
            <Bar dataKey="realized" name="Receita realizada" maxBarSize={40} radius={[6, 6, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={CHART_TOKENS.positive} fillOpacity={d.isFuture ? 0 : 1} />
              ))}
            </Bar>

            {/* Forecast revenue — light green */}
            <Bar dataKey="forecast" name="Receita prevista" maxBarSize={40} radius={[6, 6, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={CHART_TOKENS.positive} fillOpacity={0.25} stroke={CHART_TOKENS.positive} strokeWidth={1} strokeDasharray="4 2" />
              ))}
            </Bar>

            {/* Cost line */}
            <Line
              dataKey="cost"
              name="Custo"
              stroke={CHART_TOKENS.negative}
              strokeWidth={2}
              strokeDasharray="0"
              dot={false}
              activeDot={ACTIVE_DOT(CHART_TOKENS.negative)}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {futureMonths.length === 0 && (
          <p className="text-center text-paragraph-xs mt-2">
            Nenhuma receita futura agendada no Notion. Lançamentos com data futura aparecerão aqui.
          </p>
        )}
      </div>
    </div>
  )
}
