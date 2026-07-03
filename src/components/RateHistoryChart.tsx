'use client'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { MonthlyData } from '@/types'
import { COLLABORATORS } from '@/config/collaborators'
import { ChartGridLines, TOOLTIP_CARD, ACTIVE_DOT } from '@/components/charts/chart-primitives'
import WidgetCard from '@/components/ds/WidgetCard'

interface Props {
  data: MonthlyData[]
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className={`${TOOLTIP_CARD} min-w-[180px] text-paragraph-sm`}>
      <p className="mb-2 text-label-xs text-text-soft-400">{label}</p>
      {sorted.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="flex-1 text-text-sub-600">{p.name}</span>
          <span className="font-medium text-text-strong-950">R${p.value}/h</span>
        </div>
      ))}
    </div>
  )
}

export default function RateHistoryChart({ data }: Props) {
  const axisColor = 'var(--color-text-soft-400)'
  const legendColor = 'var(--color-text-sub-600)'
  const dotStroke = 'var(--color-bg-white-0)'

  const filteredData = data.filter((m) => Object.keys(m.collaboratorRates).length > 0)

  const chartData = filteredData.map((m) => {
    const row: Record<string, string | number> = { label: m.label }
    for (const collab of COLLABORATORS) {
      const rate = m.collaboratorRates[collab.id]
      if (rate !== undefined) row[collab.name] = Math.round(rate)
    }
    return row
  })

  const activeCollabs = COLLABORATORS.filter((c) =>
    filteredData.some((m) => m.collaboratorRates[c.id] !== undefined)
  )

  if (activeCollabs.length === 0) return null

  return (
    <WidgetCard className="flex flex-col gap-4">
      <div>
        <h2 className="text-label-md text-text-strong-950">Histórico de custo/hora</h2>
        <p className="mt-0.5 text-paragraph-sm text-text-sub-600">Taxa efetiva R$/h por colaborador ao longo dos meses</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <defs>
            {activeCollabs.map((c) => (
              <linearGradient key={c.id} id={`grad-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={c.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <ChartGridLines />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickMargin={8} />
          <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => <span style={{ color: legendColor }}>{value}</span>}
          />

          {activeCollabs.map((c) => (
            <Area
              key={c.id}
              type="linear"
              dataKey={c.name}
              stroke={c.color}
              strokeWidth={2}
              fill={`url(#grad-${c.id})`}
              dot={{ r: 3, fill: c.color, strokeWidth: 2, stroke: dotStroke }}
              activeDot={ACTIVE_DOT(c.color)}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </WidgetCard>
  )
}
