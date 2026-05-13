'use client'
import { DashboardData } from '@/types'

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function fmtRate(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + '/h'
}

function monthsDiff(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
  return months
}

interface Props {
  data: DashboardData
}

export default function KPICards({ data }: Props) {
  const months = monthsDiff(data.period.start, data.period.end)

  const cards = [
    {
      label: 'TOTAL INVESTIDO',
      value: fmt(data.totalCost),
      sub: `${months} meses · ${data.collaborators.length} colaboradores`,
    },
    {
      label: 'OVERHEAD SEM PROJETO',
      value: fmt(data.overheadCost),
      sub: `${data.overheadPercent.toFixed(1)}% das horas`,
    },
    {
      label: 'PROJETO MAIS CARO',
      value: data.mostExpensiveProject.name,
      sub: fmt(data.mostExpensiveProject.cost),
      largeText: true,
    },
    {
      label: 'CUSTO/HORA MAIS ALTO',
      value: fmtRate(data.highestCostPerHour.rate),
      sub: `${data.highestCostPerHour.name} · ${data.highestCostPerHour.percentOfTotal.toFixed(0)}% do custo total`,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {card.label}
          </p>
          <p className={`font-bold text-gray-900 leading-tight mb-1 ${card.largeText ? 'text-2xl' : 'text-3xl'}`}>
            {card.value}
          </p>
          <p className="text-sm text-gray-500">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
