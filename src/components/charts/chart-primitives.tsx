'use client'
// House chart style — the single source of truth for every chart in the app.
// New charts should compose these primitives instead of restyling recharts.
// Style origin: MetricAreaCard (Overview).

import { CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'

export const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 }

// House tooltip card — reuse for bespoke tooltips (totals, currency, multi-metric)
// so they match HouseTooltip's look without duplicating the styling.
export const TOOLTIP_CARD =
  'rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(14,18,27,0.12)]'

// DS state tokens for common chart semantics (theme-aware).
export const CHART_TOKENS = {
  positive: 'var(--color-success-base)',
  negative: 'var(--color-error-base)',
  info: 'var(--color-information-base)',
  warning: 'var(--color-away-base)',
} as const

export type TooltipEntry = { name?: string; value?: number | string; color?: string }

// Default value formatter (pt-BR number). Pass `format` for currency etc.
export function HouseTooltip({
  active,
  payload,
  label,
  format = (v) => Number(v ?? 0).toLocaleString('pt-BR'),
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  format?: (v: number | string | undefined) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(14,18,27,0.12)]">
      {label !== undefined && <p className="mb-0.5 text-label-xs text-text-soft-400">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-label-sm text-text-sub-600">{p.name}</span>
          <span className="ml-auto pl-4 text-label-sm font-medium text-text-strong-950">
            {format(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Horizontal-only grid, DS stroke.
export function ChartGridLines() {
  return <CartesianGrid vertical={false} stroke="var(--color-stroke-soft-200)" strokeDasharray="3 3" />
}

// X axis over the `key` field (categorical/time), DS muted ticks.
export function ChartCategoryAxis({ dataKey = 'key' }: { dataKey?: string }) {
  return (
    <XAxis
      dataKey={dataKey}
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      tick={{ fontSize: 11, fill: 'var(--color-text-soft-400)' }}
      interval="preserveStartEnd"
    />
  )
}

// Hidden Y axis (house default — value lives in the tooltip).
export function ChartValueAxis() {
  return <YAxis hide domain={[0, 'auto']} />
}

// Standard tooltip wrappers so cursors match too.
export function LineTooltip({ format }: { format?: (v: number | string | undefined) => string }) {
  return (
    <Tooltip
      cursor={{ stroke: 'var(--color-stroke-sub-300)', strokeWidth: 1 }}
      content={<HouseTooltip format={format} />}
    />
  )
}
export function BarTooltip({ format }: { format?: (v: number | string | undefined) => string }) {
  return <Tooltip cursor={{ fill: 'var(--color-bg-weak-50)' }} content={<HouseTooltip format={format} />} />
}

// <defs> gradient for area fills. Use fill={`url(#${id})`}.
export function AreaGradient({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.35} />
      <stop offset="100%" stopColor={color} stopOpacity={0.03} />
    </linearGradient>
  )
}

export const ACTIVE_DOT = (color: string) => ({
  r: 4,
  fill: color,
  stroke: 'var(--color-bg-white-0)',
  strokeWidth: 2,
})
