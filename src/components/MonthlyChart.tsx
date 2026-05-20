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
    <div className="bg-[#111111] border border-[#222222] p-3 text-sm">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#999999]">{p.name}:</span>
          <span className="font-semibold ml-auto pl-4 text-white">
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
    <div className="bg-[#111111] p-6 border border-[#222222] mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-base font-bold text-white">Evolução mensal</h2>
          <p className="text-sm text-[#999999]">Receita e custo por mês · linha = resultado líquido</p>
        </div>

        <div className="flex items-center gap-2">
          {target > 0 && !editing && (
            <span className="text-xs text-[#999999]">
              Meta: <strong className="text-white">{fmtBRL(target)}/mês</strong>
              {totalMonths > 0 && (
                <span className={`ml-2 font-semibold ${metMonths === totalMonths ? 'text-white' : 'text-[#999999]'}`}>
                  · {metMonths}/{totalMonths} meses atingidos
                </span>
              )}
            </span>
          )}

          {editing ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#999999]">R$</span>
              <input
                type="number"
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditing(false) }}
                placeholder="ex: 30000"
                className="w-32 bg-[#0A0A0A] border border-[#222222] px-2 py-1 text-sm text-white focus:outline-none focus:border-[#444444]"
              />
              <button onClick={saveTarget} className="text-xs font-semibold text-black bg-white hover:bg-[#e5e5e5] px-2 py-1 transition-colors">
                Salvar
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-[#666666] hover:text-white">Cancelar</button>
              {target > 0 && (
                <button onClick={() => { setTarget(0); localStorage.removeItem(STORAGE_KEY); setEditing(false) }} className="text-xs text-[#666666] hover:text-[#999999]">
                  Remover
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={openEditor}
              className="flex items-center gap-1.5 text-xs font-medium text-[#666666] hover:text-white border border-[#222222] px-2.5 py-1.5 transition-colors no-print hover:border-[#444444]"
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
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#666666" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#666666" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => <span style={{ color: '#999999' }}>{value}</span>}
          />

          {target > 0 && (
            <ReferenceLine
              y={target}
              stroke="#444444"
              strokeWidth={1}
              strokeDasharray="6 3"
              label={{ value: `Meta ${fmtBRL(target)}`, position: 'insideTopRight', fontSize: 11, fill: '#666666' }}
            />
          )}

          <Area type="monotone" dataKey="revenue" name="Receita" stroke="#FFFFFF" strokeWidth={2} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4, fill: '#FFFFFF' }} />
          <Area type="monotone" dataKey="cost" name="Custo" stroke="#666666" strokeWidth={2} fill="url(#gradCost)" dot={false} activeDot={{ r: 4, fill: '#666666' }} />
          <Line type="monotone" dataKey="predictedRevenue" name="Receita Prevista" stroke="#444444" strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="result" name="Resultado" stroke="#999999" strokeWidth={2.5} dot={{ r: 3, fill: '#999999', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
