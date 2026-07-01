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
    <span className={`inline-flex items-center gap-0.5 text-label-xs px-1.5 py-0.5 border ${
      up ? 'border-success-light/40 text-success-base' : 'border-error-light/40 text-error-base'
    }`}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

interface Props {
  data: DashboardData
}

function Card({ label, value, sub, largeText, delta, valueColor, subColor, subSize }: {
  label: string
  value: string
  sub: string
  largeText?: boolean
  delta?: { current: number; previous: number }
  valueColor?: string
  subColor?: string
  subSize?: string
}) {
  return (
    <div className="bg-bg-white-0 p-5 border border-stroke-soft-200">
      <p className="text-label-2xs mb-2">{label}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <p
          className={largeText ? 'text-title-h5' : 'text-title-h4'}
          style={{ color: valueColor ?? 'var(--color-text-strong-950)' }}
        >
          {value}
        </p>
        {delta && <DeltaBadge current={delta.current} previous={delta.previous} />}
      </div>
      <p className={subSize ?? 'text-label-sm'} style={{ color: subColor ?? 'var(--color-text-sub-600)' }}>{sub}</p>
    </div>
  )
}

export default function KPICards({ data }: Props) {
  const months = monthsDiff(data.period.start, data.period.end)
  const prevRevenue = data.comparison?.totalRevenue ?? 0
  const currRevenue = data.pl.reduce((s, p) => s + p.revenue, 0)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-8 border border-stroke-soft-200">
      <Card
        label="TOTAL INVESTIDO"
        value={fmt(data.totalCost)}
        sub={`${months} meses · ${data.collaborators.length} colaboradores`}
        valueColor="#1fc16b"
      />
      <Card
        label="OVERHEAD SEM PROJETO"
        value={fmt(data.overheadCost)}
        sub={`${data.overheadPercent.toFixed(1)}% das horas`}
        valueColor="#fb3748"
      />
      <Card
        label="PROJETO MAIS CARO"
        value={data.mostExpensiveProject.name}
        sub={fmt(data.mostExpensiveProject.cost)}
        largeText
        subColor="#1fc16b"
        subSize="text-label-xl"
      />
      <Card
        label="RECEITA RASTREADA"
        value={fmt(currRevenue)}
        sub={prevRevenue > 0 ? `vs ${fmt(prevRevenue)} período anterior` : 'entradas realizadas no Notion'}
        delta={prevRevenue > 0 ? { current: currRevenue, previous: prevRevenue } : undefined}
        valueColor="#1fc16b"
      />
    </div>
  )
}
