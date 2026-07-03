'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { DashboardData, ProjectCostData } from '@/types'
import { COLLABORATORS } from '@/config/collaborators'
import { TOOLTIP_CARD } from '@/components/charts/chart-primitives'
import WidgetCard from '@/components/ds/WidgetCard'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

interface Props {
  data: DashboardData
}

export default function CostByProjectChart({ data }: Props) {
  const axisColor = 'var(--color-text-soft-400)'

  const top12 = data.costByProject.slice(0, 12)

  const chartData = top12.map((p: ProjectCostData) => {
    const row: Record<string, string | number> = { name: p.projectName }
    for (const collab of COLLABORATORS) {
      row[collab.id] = p.costByCollaborator[collab.id]?.cost ?? 0
    }
    return row
  })

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    const total = payload.reduce((s, p) => s + (p.value ?? 0), 0)
    return (
      <div className={`${TOOLTIP_CARD} text-paragraph-sm`}>
        <p className="mb-2">{label}</p>
        {payload
          .filter((p) => p.value > 0)
          .map((p) => {
            const collab = COLLABORATORS.find((c) => c.id === p.dataKey)
            return (
              <div key={p.dataKey} className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: collab?.color }} />
                <span >{collab?.name}:</span>
                <span className="font-medium ml-auto" style={{ color: 'var(--color-error-base)' }}>{fmtBRL(p.value)}</span>
              </div>
            )
          })}
        <div className="border-t border-stroke-soft-200 mt-2 pt-2 flex justify-between font-semibold">
          <span >Total</span>
          <span style={{ color: 'var(--color-error-base)' }}>{fmtBRL(total)}</span>
        </div>
      </div>
    )
  }

  return (
    <WidgetCard className="flex flex-col gap-4">
      <div>
        <h2 className="text-label-md text-text-strong-950">Custo por projeto — top 12</h2>
        <p className="mt-0.5 text-paragraph-sm text-text-sub-600">Barras empilhadas por colaborador · excluindo overhead</p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {COLLABORATORS.filter((c) =>
          data.costByProject.some((p) => p.costByCollaborator[c.id]?.cost > 0)
        ).map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 text-paragraph-sm">
            <span className="w-3 h-3 rounded-sm" style={{ background: c.color }} />
            {c.name}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barSize={14}>
          <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {COLLABORATORS.map((c) => (
            <Bar key={c.id} dataKey={c.id} stackId="a" fill={c.color} radius={0}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={c.color} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </WidgetCard>
  )
}
