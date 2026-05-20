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

function monthsDiff(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const up = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 border ${
      up ? 'border-[#444444] text-[#999999]' : 'border-[#333333] text-[#666666]'
    }`}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

interface Props {
  data: DashboardData
}

function Card({ label, value, sub, largeText, delta }: {
  label: string
  value: string
  sub: string
  largeText?: boolean
  delta?: { current: number; previous: number }
}) {
  return (
    <div className="bg-[#111111] p-5 border border-[#222222]">
      <p className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <p className={`font-bold text-white leading-tight ${largeText ? 'text-2xl' : 'text-3xl'}`}>
          {value}
        </p>
        {delta && <DeltaBadge current={delta.current} previous={delta.previous} />}
      </div>
      <p className="text-sm text-[#999999]">{sub}</p>
    </div>
  )
}

export default function KPICards({ data }: Props) {
  const months = monthsDiff(data.period.start, data.period.end)
  const prevRevenue = data.comparison?.totalRevenue ?? 0
  const currRevenue = data.pl.reduce((s, p) => s + p.revenue, 0)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-8 border border-[#222222]">
      <Card
        label="TOTAL INVESTIDO"
        value={fmt(data.totalCost)}
        sub={`${months} meses · ${data.collaborators.length} colaboradores`}
      />
      <Card
        label="OVERHEAD SEM PROJETO"
        value={fmt(data.overheadCost)}
        sub={`${data.overheadPercent.toFixed(1)}% das horas`}
      />
      <Card
        label="PROJETO MAIS CARO"
        value={data.mostExpensiveProject.name}
        sub={fmt(data.mostExpensiveProject.cost)}
        largeText
      />
      <Card
        label="RECEITA RASTREADA"
        value={fmt(currRevenue)}
        sub={prevRevenue > 0 ? `vs ${fmt(prevRevenue)} período anterior` : 'entradas realizadas no Notion'}
        delta={prevRevenue > 0 ? { current: currRevenue, previous: prevRevenue } : undefined}
      />
    </div>
  )
}
