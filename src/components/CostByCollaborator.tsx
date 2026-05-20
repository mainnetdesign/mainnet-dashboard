'use client'
import { DashboardData } from '@/types'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function fmtRate(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + '/h'
}

interface Props {
  data: DashboardData
}

export default function CostByCollaborator({ data }: Props) {
  const totalMonths = (() => {
    const s = new Date(data.period.start)
    const e = new Date(data.period.end)
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
  })()

  return (
    <div className="bg-[#111111] p-6 border border-[#222222]">
      <h2 className="text-base font-bold text-white mb-1">Custo por colaborador</h2>
      <p className="text-sm text-[#999999] mb-6">Total no período de {totalMonths} meses</p>

      <div className="space-y-5">
        {data.collaborators.map((c) => (
          <div key={c.id}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold text-white">{c.name}</span>
              <div className="text-right">
                <span className="text-sm font-bold text-white">{fmtBRL(c.totalCost)}</span>
                <span className="text-xs text-[#666666] ml-2">{c.percentOfTotal.toFixed(1)}%</span>
              </div>
            </div>

            <div className="relative h-1.5 bg-[#222222] mb-1">
              <div
                className="absolute left-0 top-0 h-full transition-all"
                style={{ width: `${c.percentOfTotal}%`, background: c.color }}
              />
            </div>

            <p className="text-xs text-[#666666]">{fmtRate(c.effectiveHourlyRate)}</p>
          </div>
        ))}

        <div className="border-t border-[#222222] pt-4 flex justify-between">
          <span className="text-sm font-semibold text-[#999999]">Total geral</span>
          <span className="text-sm font-bold text-white">{fmtBRL(data.totalCostAllCollaborators)}</span>
        </div>
      </div>
    </div>
  )
}
