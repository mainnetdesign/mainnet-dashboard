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
  ReferenceLine,
} from 'recharts'
import { MonthlyData } from '@/types'
import WidgetCard from '@/components/ds/WidgetCard'
import * as Button from '@/components/ui/button'
import { ChartGridLines, TOOLTIP_CARD, ACTIVE_DOT } from '@/components/charts/chart-primitives'

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
    <div className={`${TOOLTIP_CARD} text-paragraph-sm`}>
      <p className="mb-2 text-label-xs text-text-soft-400">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-text-sub-600">{p.name}:</span>
          <span className="font-medium ml-auto pl-4 text-text-strong-950">
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
  const axisColor = 'var(--color-text-soft-400)'
  const legendColor = 'var(--color-text-sub-600)'
  const revenueColor = 'var(--color-success-base)'
  const costColor = 'var(--color-error-base)'
  const resultColor = 'var(--color-information-base)'
  const targetColor = 'var(--color-stroke-sub-300)'

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
    <WidgetCard className="flex flex-col gap-4 no-print">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-label-md">Evolução mensal</h2>
          <p className="text-paragraph-sm">Receita e custo por mês · linha = resultado líquido</p>
        </div>

        <div className="flex items-center gap-2">
          {target > 0 && !editing && (
            <span className="text-paragraph-xs">
              Meta: <strong >{fmtBRL(target)}/mês</strong>
              {totalMonths > 0 && (
                <span className={`ml-2 font-semibold ${metMonths === totalMonths ? 'text-text-strong-950' : 'text-text-sub-600'}`}>
                  · {metMonths}/{totalMonths} meses atingidos
                </span>
              )}
            </span>
          )}

          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-paragraph-sm text-text-sub-600">R$</span>
              <input
                type="number"
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditing(false) }}
                placeholder="ex: 30000"
                className="w-32 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 text-paragraph-sm focus:border-stroke-sub-300 focus:outline-none"
              />
              <Button.Root variant="primary" mode="filled" size="xsmall" onClick={saveTarget}>Salvar</Button.Root>
              <Button.Root variant="neutral" mode="ghost" size="xsmall" onClick={() => setEditing(false)}>Cancelar</Button.Root>
              {target > 0 && (
                <Button.Root variant="neutral" mode="ghost" size="xsmall" onClick={() => { setTarget(0); localStorage.removeItem(STORAGE_KEY); setEditing(false) }}>
                  Remover
                </Button.Root>
              )}
            </div>
          ) : (
            <Button.Root variant="neutral" mode="stroke" size="xsmall" onClick={openEditor} className="no-print">
              {target > 0 ? 'Editar meta' : 'Definir meta'}
            </Button.Root>
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

          <ChartGridLines />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickMargin={8} />
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

          <Area type="linear" dataKey="revenue" name="Receita" stroke={revenueColor} strokeWidth={2} fill="url(#gradRevenue)" dot={false} activeDot={ACTIVE_DOT(revenueColor)} />
          <Area type="linear" dataKey="cost" name="Custo" stroke={costColor} strokeWidth={2} fill="url(#gradCost)" dot={false} activeDot={ACTIVE_DOT(costColor)} />
          <Line type="linear" dataKey="predictedRevenue" name="Receita Prevista" stroke={targetColor} strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={ACTIVE_DOT(targetColor)} />
          <Line type="linear" dataKey="result" name="Resultado" stroke={resultColor} strokeWidth={2.5} dot={{ r: 3, fill: resultColor, strokeWidth: 0 }} activeDot={ACTIVE_DOT(resultColor)} />
        </ComposedChart>
      </ResponsiveContainer>
    </WidgetCard>
  )
}
