'use client'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { MonthlyData } from '@/types'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

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
          <span className={`font-medium ml-auto ${p.name === 'Resultado' ? (p.value >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-900'}`}>
            {p.value >= 0 ? '' : '-'}{fmtBRL(Math.abs(p.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
      <h2 className="text-base font-bold text-gray-900 mb-1">Evolução mensal</h2>
      <p className="text-sm text-gray-500 mb-6">
        Receita e custo por mês · linha = resultado líquido
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
          />
          <Bar dataKey="revenue" name="Receita" fill="#D1FAE5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cost" name="Custo" fill="#FEE2E2" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="result"
            name="Resultado"
            stroke="#2563EB"
            strokeWidth={2}
            dot={{ r: 3, fill: '#2563EB' }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
