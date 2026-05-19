'use client'
import { useState, useEffect } from 'react'
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
  const [target, setTarget] = useState<number>(0)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')

  // Load from localStorage
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

  // Months where revenue met the target
  const metMonths = target > 0 ? data.filter((m) => m.revenue >= target).length : 0
  const totalMonths = data.filter((m) => m.revenue > 0).length

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <div>
          <h2 className="text-base font-bold text-gray-900">Evolução mensal</h2>
          <p className="text-sm text-gray-500">
            Receita e custo por mês · linha = resultado líquido
          </p>
        </div>

        {/* Target control */}
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
                  Remover meta
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

      <div className="mt-6">
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
            {target > 0 && (
              <ReferenceLine
                y={target}
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{ value: `Meta ${fmtBRL(target)}`, position: 'insideTopRight', fontSize: 11, fill: '#D97706' }}
              />
            )}
            <Bar dataKey="revenue" name="Receita" fill="#D1FAE5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cost" name="Custo" fill="#FEE2E2" radius={[4, 4, 0, 0]} />
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
    </div>
  )
}
