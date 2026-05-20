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
import { useTheme } from 'next-themes'

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
    <div className="bg-[var(--bg3)] border border-[var(--bd)] p-3 text-sm">
      <p className="font-semibold text-[var(--tx)] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--tx2)]">{p.name}:</span>
          <span className="font-semibold ml-auto pl-4 text-[var(--tx)]">
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
  const { theme } = useTheme()

  const isDark = theme === 'dark'
  const gridColor = isDark ? '#222222' : '#EEEEEE'
  const axisColor = isDark ? '#666666' : '#999999'
  const legendColor = isDark ? '#999999' : '#555555'
  const revenueColor = isDark ? '#FFFFFF' : '#000000'
  const costColor = isDark ? '#666666' : '#999999'
  const resultColor = isDark ? '#999999' : '#888888'
  const targetColor = isDark ? '#444444' : '#BBBBBB'

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
    <div className="bg-[var(--bg3)] p-6 border border-[var(--bd)] mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-base font-bold text-[var(--tx)]">Evolução mensal</h2>
          <p className="text-sm text-[var(--tx2)]">Receita e custo por mês · linha = resultado líquido</p>
        </div>

        <div className="flex items-center gap-2">
          {target > 0 && !editing && (
            <span className="text-xs text-[var(--tx2)]">
              Meta: <strong className="text-[var(--tx)]">{fmtBRL(target)}/mês</strong>
              {totalMonths > 0 && (
                <span className={`ml-2 font-semibold ${metMonths === totalMonths ? 'text-[var(--tx)]' : 'text-[var(--tx2)]'}`}>
                  · {metMonths}/{totalMonths} meses atingidos
                </span>
              )}
            </span>
          )}

          {editing ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--tx2)]">R$</span>
              <input
                type="number"
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditing(false) }}
                placeholder="ex: 30000"
                className="w-32 bg-[var(--bg2)] border border-[var(--bd)] px-2 py-1 text-sm text-[var(--tx)] focus:outline-none focus:border-[var(--bd3)]"
              />
              <button onClick={saveTarget} className="text-xs font-semibold text-[var(--inv-tx)] bg-[var(--inv)] hover:opacity-80 px-2 py-1 transition-opacity">
                Salvar
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-[var(--tx3)] hover:text-[var(--tx)]">Cancelar</button>
              {target > 0 && (
                <button onClick={() => { setTarget(0); localStorage.removeItem(STORAGE_KEY); setEditing(false) }} className="text-xs text-[var(--tx3)] hover:text-[var(--tx2)]">
                  Remover
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={openEditor}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--tx3)] hover:text-[var(--tx)] border border-[var(--bd)] px-2.5 py-1.5 transition-colors no-print hover:border-[var(--bd3)]"
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
              <stop offset="5%" stopColor={revenueColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={revenueColor} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={costColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={costColor} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => <span style={{ color: legendColor }}>{value}</span>}
          />

          {target > 0 && (
            <ReferenceLine
              y={target}
              stroke={targetColor}
              strokeWidth={1}
              strokeDasharray="6 3"
              label={{ value: `Meta ${fmtBRL(target)}`, position: 'insideTopRight', fontSize: 11, fill: axisColor }}
            />
          )}

          <Area type="monotone" dataKey="revenue" name="Receita" stroke={revenueColor} strokeWidth={2} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4, fill: revenueColor }} />
          <Area type="monotone" dataKey="cost" name="Custo" stroke={costColor} strokeWidth={2} fill="url(#gradCost)" dot={false} activeDot={{ r: 4, fill: costColor }} />
          <Line type="monotone" dataKey="predictedRevenue" name="Receita Prevista" stroke={targetColor} strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="result" name="Resultado" stroke={resultColor} strokeWidth={2.5} dot={{ r: 3, fill: resultColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
