'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Badge from '@/components/ds/Badge'
import WidgetCard from '@/components/ds/WidgetCard'
import type { OverviewDailyPoint, OverviewKPIs, OverviewUserDayPoint, OverviewAttentionPoint, UsersKPIs, ImportsKPIs } from '@/types/insta2figma'
import { fmtUSD } from '@/lib/insta2figma/constants'
import type { BadgeVariant } from '@/lib/design-system/tokens'
import AttentionPointsCard from '@/components/store/AttentionPointsCard'
import { cn } from '@/utils/cn'

export const OVERVIEW_CHART_SYNC_ID = 'insta2figma-overview'
export const USERS_CHART_SYNC_ID = 'insta2figma-users'
export const IMPORTS_CHART_SYNC_ID = 'insta2figma-imports'

const USER_NEVER_EXPORTED_COLOR = '#525866'
const USER_EXPORTED_COLOR = '#1fc16b'

function deltaStr(pct: number) {
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function deltaVariant(pct: number): BadgeVariant {
  return pct >= 0 ? 'success' : 'error'
}

type MetricAreaCardProps = {
  label: string
  value: React.ReactNode
  delta?: string
  deltaVariant?: BadgeVariant
  data: OverviewDailyPoint[]
  color?: string
  formatValue?: (value: number) => string
  size?: 'large' | 'compact'
  className?: string
  chartId: string
  syncId?: string
}

export default function MetricAreaCard({
  label,
  value,
  delta,
  deltaVariant = 'success',
  data,
  color = '#dd2a7b',
  formatValue = (v) => v.toLocaleString('pt-BR'),
  size = 'compact',
  className,
  chartId,
  syncId = OVERVIEW_CHART_SYNC_ID,
}: MetricAreaCardProps) {
  const ticks = useMemo(
    () => (data.length > 1 ? [data[0].date, data[data.length - 1].date] : data.map((d) => d.date)),
    [data],
  )

  const tickLabels = useMemo(() => new Map(data.map((d) => [d.date, d.label])), [data])
  const chartHeight = size === 'large' ? 200 : 120

  return (
    <WidgetCard className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-paragraph-sm text-text-sub-600">{label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p
              className={cn(
                'font-display text-text-strong-950',
                size === 'large' ? 'text-title-h4' : 'text-title-h5',
              )}
            >
              {value}
            </p>
            {delta && <Badge variant={deltaVariant}>{delta}</Badge>}
          </div>
        </div>
      </div>

      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            syncId={syncId}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`fill-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-stroke-soft-200)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: 'var(--color-text-soft-400)' }}
              tickFormatter={(v) => tickLabels.get(v) ?? v}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              cursor={{ stroke: 'var(--color-stroke-sub-300)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0]?.payload as OverviewDailyPoint | undefined
                if (!point) return null
                return (
                  <div className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(14,18,27,0.12)]">
                    <p className="text-label-xs text-text-soft-400">{point.label}</p>
                    <p className="text-label-sm font-medium text-text-strong-950">
                      {formatValue(Number(payload[0]?.value ?? 0))}
                    </p>
                  </div>
                )
              }}
            />
            <Area
              type="linear"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${chartId})`}
              activeDot={{
                r: 4,
                fill: color,
                stroke: 'var(--color-bg-white-0)',
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  )
}

function NewUsersAreaCard({
  label,
  value,
  delta,
  deltaVariant: deltaVar = 'success',
  data,
  size = 'large',
  className,
  chartId,
  syncId = OVERVIEW_CHART_SYNC_ID,
}: {
  label: string
  value: React.ReactNode
  delta?: string
  deltaVariant?: BadgeVariant
  data: OverviewUserDayPoint[]
  size?: 'large' | 'compact'
  className?: string
  chartId: string
  syncId?: string
}) {
  const ticks = useMemo(
    () => (data.length > 1 ? [data[0].date, data[data.length - 1].date] : data.map((d) => d.date)),
    [data],
  )
  const tickLabels = useMemo(() => new Map(data.map((d) => [d.date, d.label])), [data])
  const chartHeight = size === 'large' ? 200 : 120
  const exportedTotal = useMemo(() => data.reduce((s, d) => s + d.exported, 0), [data])
  const neverTotal = useMemo(() => data.reduce((s, d) => s + d.neverExported, 0), [data])

  return (
    <WidgetCard className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-paragraph-sm text-text-sub-600">{label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p
              className={cn(
                'font-display text-text-strong-950',
                size === 'large' ? 'text-title-h4' : 'text-title-h5',
              )}
            >
              {value}
            </p>
            {delta && <Badge variant={deltaVar}>{delta}</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-label-xs text-text-sub-600">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: USER_NEVER_EXPORTED_COLOR }}
              />
              Sem exportação · {neverTotal.toLocaleString('pt-BR')}
            </span>
            <span className="flex items-center gap-1.5 text-label-xs text-text-sub-600">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: USER_EXPORTED_COLOR }}
              />
              Com exportação · {exportedTotal.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            syncId={syncId}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`fill-${chartId}-never`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={USER_NEVER_EXPORTED_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={USER_NEVER_EXPORTED_COLOR} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id={`fill-${chartId}-exported`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={USER_EXPORTED_COLOR} stopOpacity={0.4} />
                <stop offset="100%" stopColor={USER_EXPORTED_COLOR} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-stroke-soft-200)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: 'var(--color-text-soft-400)' }}
              tickFormatter={(v) => tickLabels.get(v) ?? v}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              cursor={{ stroke: 'var(--color-stroke-sub-300)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0]?.payload as OverviewUserDayPoint | undefined
                if (!point) return null
                return (
                  <div className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(14,18,27,0.12)]">
                    <p className="mb-1.5 text-label-xs text-text-soft-400">{point.label}</p>
                    <p className="text-label-sm text-text-sub-600">
                      <span
                        className="mr-1.5 inline-block size-2 rounded-full"
                        style={{ backgroundColor: USER_NEVER_EXPORTED_COLOR }}
                      />
                      Sem exportação: {point.neverExported.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-label-sm text-text-sub-600">
                      <span
                        className="mr-1.5 inline-block size-2 rounded-full"
                        style={{ backgroundColor: USER_EXPORTED_COLOR }}
                      />
                      Com exportação: {point.exported.toLocaleString('pt-BR')}
                    </p>
                    <p className="mt-1 border-t border-stroke-soft-200 pt-1 text-label-sm font-medium text-text-strong-950">
                      Total: {point.value.toLocaleString('pt-BR')}
                    </p>
                  </div>
                )
              }}
            />
            <Area
              type="linear"
              dataKey="neverExported"
              stroke={USER_NEVER_EXPORTED_COLOR}
              strokeWidth={2}
              fill={`url(#fill-${chartId}-never)`}
              isAnimationActive={false}
            />
            <Area
              type="linear"
              dataKey="exported"
              stroke={USER_EXPORTED_COLOR}
              strokeWidth={2}
              fill={`url(#fill-${chartId}-exported)`}
              activeDot={{
                r: 4,
                fill: USER_EXPORTED_COLOR,
                stroke: 'var(--color-bg-white-0)',
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  )
}

export function OverviewMetricsGrid({
  kpis,
  attentionPoints,
  className,
}: {
  kpis: OverviewKPIs
  attentionPoints: OverviewAttentionPoint[]
  className?: string
}) {
  const { series } = kpis
  const newUsersInPeriod = series.users.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NewUsersAreaCard
          chartId="overview-users"
          syncId={OVERVIEW_CHART_SYNC_ID}
          label="Novos usuários"
          value={newUsersInPeriod.toLocaleString('pt-BR')}
          delta={deltaStr(kpis.usersDeltaPct)}
          deltaVariant={deltaVariant(kpis.usersDeltaPct)}
          data={series.users}
          className="md:col-span-2"
        />
        <AttentionPointsCard points={attentionPoints} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricAreaCard
          chartId="overview-earnings"
          syncId={OVERVIEW_CHART_SYNC_ID}
          label="Receitas"
          value={fmtUSD(kpis.earningsUSD)}
          delta={deltaStr(kpis.earningsDeltaPct)}
          deltaVariant={deltaVariant(kpis.earningsDeltaPct)}
          data={series.earnings}
          color="#dd2a7b"
          formatValue={(v) => fmtUSD(v)}
        />
        <MetricAreaCard
          chartId="overview-images"
          syncId={OVERVIEW_CHART_SYNC_ID}
          label="Imagens importadas"
          value={kpis.imagesImported.toLocaleString('pt-BR')}
          delta={deltaStr(kpis.imagesDeltaPct)}
          deltaVariant={deltaVariant(kpis.imagesDeltaPct)}
          data={series.images}
          color="#f58529"
        />
        <MetricAreaCard
          chartId="overview-jobs"
          syncId={OVERVIEW_CHART_SYNC_ID}
          label="Importações"
          value={kpis.jobsInPeriod.toLocaleString('pt-BR')}
          data={series.jobs}
          color="#335cff"
        />
      </div>
    </div>
  )
}

export function UsersMetricsGrid({ kpis, className }: { kpis: UsersKPIs; className?: string }) {
  const { series } = kpis

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <MetricAreaCard
        chartId="users-total"
        syncId={USERS_CHART_SYNC_ID}
        size="large"
        label="Total de usuários"
        value={kpis.total.toLocaleString('pt-BR')}
        data={series.cumulative}
        color="#dd2a7b"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricAreaCard
          chartId="users-active"
          syncId={USERS_CHART_SYNC_ID}
          label="Ativos no período"
          value={kpis.active.toLocaleString('pt-BR')}
          delta={deltaStr(kpis.activeDeltaPct)}
          deltaVariant={deltaVariant(kpis.activeDeltaPct)}
          data={series.active}
          color="#8134af"
        />
        <MetricAreaCard
          chartId="users-new"
          syncId={USERS_CHART_SYNC_ID}
          label="Novos no período"
          value={kpis.newInPeriod.toLocaleString('pt-BR')}
          delta={deltaStr(kpis.newDeltaPct)}
          deltaVariant={deltaVariant(kpis.newDeltaPct)}
          data={series.newUsers}
          color="#f58529"
        />
        <MetricAreaCard
          chartId="users-conversions"
          syncId={USERS_CHART_SYNC_ID}
          label="Conversão free→pago"
          value={`${kpis.paidConversionPct}%`}
          delta={deltaStr(kpis.conversionDeltaPct)}
          deltaVariant={deltaVariant(kpis.conversionDeltaPct)}
          data={series.conversions}
          color="#335cff"
          formatValue={(v) => `${v} assinatura${v === 1 ? '' : 's'}`}
        />
      </div>
    </div>
  )
}

export function ImportsMetricsGrid({ kpis, className }: { kpis: ImportsKPIs; className?: string }) {
  const { series } = kpis

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <MetricAreaCard
        chartId="imports-total"
        syncId={IMPORTS_CHART_SYNC_ID}
        size="large"
        label="Total de importações"
        value={kpis.totalImports.toLocaleString('pt-BR')}
        delta={deltaStr(kpis.importsDeltaPct)}
        deltaVariant={deltaVariant(kpis.importsDeltaPct)}
        data={series.imports}
        color="#335cff"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricAreaCard
          chartId="imports-images"
          syncId={IMPORTS_CHART_SYNC_ID}
          label="Imagens importadas"
          value={kpis.totalImages.toLocaleString('pt-BR')}
          delta={deltaStr(kpis.imagesDeltaPct)}
          deltaVariant={deltaVariant(kpis.imagesDeltaPct)}
          data={series.images}
          color="#f58529"
        />
        <MetricAreaCard
          chartId="imports-avg"
          syncId={IMPORTS_CHART_SYNC_ID}
          label="Média de imagens por importação"
          value={kpis.avgImagesPerImport.toLocaleString('pt-BR')}
          delta={deltaStr(kpis.avgDeltaPct)}
          deltaVariant={deltaVariant(kpis.avgDeltaPct)}
          data={series.avgPerImport}
          color="#8134af"
          formatValue={(v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
        />
        <MetricAreaCard
          chartId="imports-failed"
          syncId={IMPORTS_CHART_SYNC_ID}
          label={`Importações com erro (${kpis.failureRatePct}% do total)`}
          value={kpis.failedImports.toLocaleString('pt-BR')}
          delta={deltaStr(kpis.failedDeltaPct)}
          deltaVariant={kpis.failedImports === 0 ? 'success' : 'error'}
          data={series.failed}
          color="#e5484d"
          formatValue={(v) => `${v} falha${v === 1 ? '' : 's'}`}
        />
      </div>
    </div>
  )
}
