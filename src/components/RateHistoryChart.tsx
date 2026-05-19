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
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xl text-sm min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {sorted.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 flex-1">{p.name}</span>
          <span className="font-semibold text-gray-900">R${p.value}/h</span>
        </div>
      ))}
    </div>
  )
}

export default function RateHistoryChart({ data }: Props) {
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
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
      <h2 className="text-base font-bold text-gray-900 mb-1">Histórico de custo/hora</h2>
      <p className="text-sm text-gray-500 mb-6">
        Taxa efetiva R$/h por colaborador ao longo dos meses
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          {/* Gradient defs for each collaborator */}
          <defs>
            {activeCollabs.map((c) => (
              <linearGradient key={c.id} id={`grad-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={c.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${v}`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
          />

          {activeCollabs.map((c) => (
            <Area
              key={c.id}
              type="monotone"
              dataKey={c.name}
              stroke={c.color}
              strokeWidth={2.5}
              fill={`url(#grad-${c.id})`}
              dot={{ r: 3.5, fill: c.color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: c.color, stroke: '#fff', strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
