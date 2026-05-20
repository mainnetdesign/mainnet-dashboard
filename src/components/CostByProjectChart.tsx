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
      <div className="bg-[#111111] border border-[#222222] p-3 text-sm">
        <p className="font-semibold text-white mb-2">{label}</p>
        {payload
          .filter((p) => p.value > 0)
          .map((p) => {
            const collab = COLLABORATORS.find((c) => c.id === p.dataKey)
            return (
              <div key={p.dataKey} className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: collab?.color }} />
                <span className="text-[#999999]">{collab?.name}:</span>
                <span className="font-medium text-white ml-auto">{fmtBRL(p.value)}</span>
              </div>
            )
          })}
        <div className="border-t border-[#222222] mt-2 pt-2 flex justify-between font-semibold text-white">
          <span>Total</span>
          <span>{fmtBRL(total)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111111] p-6 border border-[#222222]">
      <h2 className="text-base font-bold text-white mb-1">Custo por projeto — top 12</h2>
      <p className="text-sm text-[#999999] mb-5">Barras empilhadas por colaborador · excluindo overhead</p>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
        {COLLABORATORS.filter((c) =>
          data.costByProject.some((p) => p.costByCollaborator[c.id]?.cost > 0)
        ).map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 text-sm text-[#999999]">
            <span className="w-3 h-3 rounded-sm" style={{ background: c.color }} />
            {c.name}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barSize={14}>
          <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: '#999999' }} axisLine={false} tickLine={false} />
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
    </div>
  )
}
