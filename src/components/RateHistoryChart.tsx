'use client'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { MonthlyData } from '@/types'
import { COLLABORATORS } from '@/config/collaborators'
import { useTheme } from 'next-themes'

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
    <div className="bg-[var(--bg3)] border border-[var(--bd)] p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-[var(--tx)] mb-2">{label}</p>
      {sorted.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[var(--tx2)] flex-1">{p.name}</span>
          <span className="font-semibold" style={{ color: '#60A5FA' }}>R${p.value}/h</span>
        </div>
      ))}
    </div>
  )
}

export default function RateHistoryChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridColor = isDark ? '#222222' : '#EEEEEE'
  const axisColor = isDark ? '#666666' : '#999999'
  const legendColor = isDark ? '#999999' : '#555555'
  const dotStroke = isDark ? '#000000' : '#FFFFFF'

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
    <div className="bg-[var(--bg3)] p-6 border border-[var(--bd)] mb-8">
      <h2 className="text-base font-bold text-[var(--tx)] mb-1">Histórico de custo/hora</h2>
      <p className="text-sm text-[var(--tx2)] mb-6">Taxa efetiva R$/h por colaborador ao longo dos meses</p>
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

          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => <span style={{ color: legendColor }}>{value}</span>}
          />

          {activeCollabs.map((c) => (
            <Area
              key={c.id}
              type="monotone"
              dataKey={c.name}
              stroke={c.color}
              strokeWidth={2.5}
              fill={`url(#grad-${c.id})`}
              dot={{ r: 3.5, fill: c.color, strokeWidth: 2, stroke: dotStroke }}
              activeDot={{ r: 6, fill: c.color, stroke: dotStroke, strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
