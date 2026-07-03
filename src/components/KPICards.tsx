'use client'

import StatWidget from '@/components/ds/StatWidget'
import type { DashboardData } from '@/types'
import type { BadgeVariant } from '@/lib/design-system/tokens'

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

function deltaBadge(current: number, previous: number): { delta?: string; variant: BadgeVariant } {
  if (previous === 0) return { variant: 'success' }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  return {
    delta: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`,
    variant: pct >= 0 ? 'success' : 'error',
  }
}

interface Props {
  data: DashboardData
}

export default function KPICards({ data }: Props) {
  const months = monthsDiff(data.period.start, data.period.end)
  const prevRevenue = data.comparison?.totalRevenue ?? 0
  const currRevenue = data.pl.reduce((s, p) => s + p.revenue, 0)
  const revenueDelta = deltaBadge(currRevenue, prevRevenue)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatWidget
        label="Total investido"
        value={<span className="text-success-base">{fmt(data.totalCost)}</span>}
        sparklineData={data.monthly.map((m) => m.cost)}
      />
      <StatWidget
        label="Overhead sem projeto"
        value={<span className="text-error-base">{fmt(data.overheadCost)}</span>}
        delta={`${data.overheadPercent.toFixed(1)}% das horas`}
        deltaVariant="error"
      />
      <StatWidget
        label="Projeto mais caro"
        value={data.mostExpensiveProject.name}
        delta={fmt(data.mostExpensiveProject.cost)}
        deltaVariant="neutral"
      />
      <StatWidget
        label="Receita rastreada"
        value={<span className="text-success-base">{fmt(currRevenue)}</span>}
        delta={revenueDelta.delta ?? `${months} meses · ${data.collaborators.length} pessoas`}
        deltaVariant={revenueDelta.variant}
        sparklineData={data.monthly.map((m) => m.revenue)}
      />
    </div>
  )
}
