'use client'
import {
  LineChart,
  Line,
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium ml-auto text-gray-900">
            R${p.value.toFixed(0)}/h
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RateHistoryChart({ data }: Props) {
  // Only show months that have at least one collaborator rate (i.e. Clockify data exists)
  const filteredData = data.filter((m) => Object.keys(m.collaboratorRates).length > 0)

  // Build chart rows: each row = a month, keys = collaborator names
  const chartData = filteredData.map((m) => {
    const row: Record<string, string | number> = { label: m.label }
    for (const collab of COLLABORATORS) {
      const rate = m.collaboratorRates[collab.id]
      if (rate !== undefined) row[collab.name] = Math.round(rate)
    }
    return row
  })

  // Only include collaborators that appear in at least one month
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
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
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
            <Line
              key={c.id}
              type="monotone"
              dataKey={c.name}
              stroke={c.color}
              strokeWidth={2}
              dot={{ r: 3, fill: c.color }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
