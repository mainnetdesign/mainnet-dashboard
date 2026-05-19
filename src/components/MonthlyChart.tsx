'use client'
import { useState, useEffect } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { MonthlyData } from '@/types'

const STORAGE_KEY = 'mainnet-monthly-target'

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
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xl text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className={`font-semibold ml-auto pl-4 ${
            p.name === 'Resultado'
              ? p.value >= 0 ? 'text-green-600' : 'text-red-500'
              : 'text-gray-900'
          }`}>
            {p.value >= 0 ? '' : '-'}{fmtBRL(Math.abs(p.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyChart({ data }: Props) {
  const [target, setTarget] = useState<number>(0)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setTarget(Number(saved))
  }, [])

  function saveTarget() {
    const val = Number(inputVal.replace(/\D/g, ''))
    setTarget(val)
    localStorage.setItem(STORAGE_KEY, String(val))
    setEditing(false)
  }

  function openEditor() {
    setInputVal(target > 0 ? String(target) : '')
    setEditing(true)
  }

  const metMonths = target > 0 ? data.filter((m) => m.revenue >= target).length : 0
  const totalMonths = data.filter((m) => m.revenue > 0).length

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-base font-bold text-gray-900">Evolução mensal</h2>
          <p className="text-sm text-gray-500">
            Receita e custo por mês · linha = resultado líquido
          </p>
        </div>

        <div className="flex items-center gap-2">
          {target > 0 && !editing && (
            <span className="text-xs text-gray-500">
              Meta: <strong className="text-gray-700">{fmtBRL(target)}/mês</strong>
              {totalMonths > 0 && (
                <span className={`ml-2 font-semibold ${metMonths === totalMonths ? 'text-green-600' : 'text-amber-600'}`}>
                  · {metMonths}/{totalMonths} meses atingidos
                </span>
              )}
            </span>
          )}

          {editing ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">R$</span>
              <input
                type="number"
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditing(false) }}
                placeholder="ex: 30000"
                className="w-32 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button onClick={saveTarget} className="text-xs font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors">
                Salvar
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Cancelar
              </button>
              {target > 0 && (
                <button onClick={() => { setTarget(0); localStorage.removeItem(STORAGE_KEY); setEditing(false) }} className="text-xs text-red-400 hover:text-red-600">
                  Remover
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={openEditor}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors no-print"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {target > 0 ? 'Editar meta' : 'Definir meta'}
            </button>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          {/* Gradient defs */}
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
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

          {target > 0 && (
            <ReferenceLine
              y={target}
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{ value: `Meta ${fmtBRL(target)}`, position: 'insideTopRight', fontSize: 11, fill: '#D97706' }}
            />
          )}

          {/* Revenue area */}
          <Area
            type="monotone"
            dataKey="revenue"
            name="Receita"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#gradRevenue)"
            dot={false}
            activeDot={{ r: 4, fill: '#10B981' }}
          />

          {/* Cost area */}
          <Area
            type="monotone"
            dataKey="cost"
            name="Custo"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#gradCost)"
            dot={false}
            activeDot={{ r: 4, fill: '#EF4444' }}
          />

          {/* Predicted revenue line */}
          <Line
            type="monotone"
            dataKey="predictedRevenue"
            name="Receita Prevista"
            stroke="#9333EA"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Result line */}
          <Line
            type="monotone"
            dataKey="result"
            name="Resultado"
            stroke="#2563EB"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
