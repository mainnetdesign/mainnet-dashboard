'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { RiDraggable, RiPencilLine, RiCloseLine } from '@remixicon/react'
import type { ChartConfig } from '@/lib/charts/types'
import { MEASURES, SERIES_PALETTE } from '@/lib/charts/catalog'
import {
  HouseTooltip,
  ChartGridLines,
  ChartCategoryAxis,
  ChartValueAxis,
  LineTooltip,
  BarTooltip,
  AreaGradient,
  ACTIVE_DOT,
  CHART_MARGIN,
} from './chart-primitives'
import { cn } from '@/utils/cn'

type Row = Record<string, string | number>

export default function ChartCard({
  config,
  start,
  end,
  editing,
  onEdit,
  onRemove,
}: {
  config: ChartConfig
  start: string
  end: string
  editing: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const measuresKey = config.series.map((s) => s.measure).join(',')

  const load = useCallback(() => {
    const params = new URLSearchParams({
      measures: measuresKey,
      dimension: config.dimension,
      start,
      end,
    })
    setLoading(true)
    fetch(`/api/store/insta2figma/chart?${params}`)
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [measuresKey, config.dimension, start, end])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-4',
        editing && 'ring-1 ring-primary-base/40',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-label-sm text-text-strong-950">{config.title}</h3>
        {editing && (
          <div className="flex items-center gap-1">
            <span
              className="cursor-grab rounded p-1 text-text-sub-600"
              aria-hidden
            >
              <RiDraggable size={16} />
            </span>
            <button
              onClick={onEdit}
              className="rounded p-1 text-text-sub-600 hover:bg-bg-weak-50"
              aria-label="Editar gráfico"
            >
              <RiPencilLine size={15} />
            </button>
            <button
              onClick={onRemove}
              className="rounded p-1 text-text-sub-600 hover:bg-bg-weak-50 hover:text-error-base"
              aria-label="Remover gráfico"
            >
              <RiCloseLine size={15} />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="mn-shimmer h-full min-h-32 rounded-xl" />
        ) : rows.length === 0 ? (
          <div className="flex h-full min-h-32 items-center justify-center text-paragraph-sm text-text-sub-600">
            Sem dados no período
          </div>
        ) : (
          <ChartCanvas config={config} rows={rows} />
        )}
      </div>
    </div>
  )
}

// Shared renderer — used by the live cards and the builder preview.
export function ChartCanvas({ config, rows }: { config: ChartConfig; rows: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={128}>
      {renderChart(config, rows)}
    </ResponsiveContainer>
  )
}

function seriesName(measure: string) {
  return MEASURES[measure]?.label ?? measure
}

function renderChart(config: ChartConfig, rows: Row[]) {
  const multi = config.series.length > 1

  if (config.type === 'pie') {
    // Pie uses the first series only, sliced by dimension key.
    const s = config.series[0]
    const data = rows.map((r) => ({ name: String(r.key), value: Number(r[s.measure]) }))
    return (
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="var(--color-bg-white-0)"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<HouseTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    )
  }

  if (config.type === 'line') {
    return (
      <AreaChart data={rows} margin={CHART_MARGIN}>
        <defs>
          {config.series.map((s) => (
            <AreaGradient key={s.measure} id={`fill-${config.id}-${s.measure}`} color={s.color} />
          ))}
        </defs>
        <ChartGridLines />
        <ChartCategoryAxis />
        <ChartValueAxis />
        <LineTooltip />
        {config.series.map((s) => (
          <Area
            key={s.measure}
            type="linear"
            dataKey={s.measure}
            name={seriesName(s.measure)}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#fill-${config.id}-${s.measure})`}
            activeDot={ACTIVE_DOT(s.color)}
          />
        ))}
        {multi && <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />}
      </AreaChart>
    )
  }

  return (
    <BarChart data={rows} margin={CHART_MARGIN}>
      <ChartGridLines />
      <ChartCategoryAxis />
      <ChartValueAxis />
      <BarTooltip />
      {config.series.map((s) => (
        <Bar key={s.measure} dataKey={s.measure} name={seriesName(s.measure)} fill={s.color} radius={[6, 6, 0, 0]} />
      ))}
      {multi && <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />}
    </BarChart>
  )
}
