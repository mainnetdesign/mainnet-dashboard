'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import WidgetCard from '@/components/ds/WidgetCard'
import type { ProfileImportRank } from '@/types/insta2figma'

type ProfileRankingChartProps = {
  profiles: ProfileImportRank[]
  className?: string
}

export default function ProfileRankingChart({ profiles, className }: ProfileRankingChartProps) {
  const chartData = useMemo(
    () =>
      [...profiles]
        .sort((a, b) => a.images - b.images)
        .map((p) => ({
          label: `@${p.username}`,
          images: p.images,
          imports: p.imports,
        })),
    [profiles],
  )

  const chartHeight = Math.max(280, chartData.length * 36 + 48)

  return (
    <WidgetCard className={className}>
      <div className="mb-4">
        <p className="text-label-sm text-text-strong-950">Perfis mais importados</p>
        <p className="mt-0.5 text-paragraph-xs text-text-soft-400">
          Ranking por total de imagens importadas no período
        </p>
      </div>

      {chartData.length === 0 ? (
        <p className="py-12 text-center text-paragraph-sm text-text-soft-400">
          Nenhum perfil importado no período
        </p>
      ) : (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--color-stroke-soft-200)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="images"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-text-soft-400)' }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-text-sub-600)' }}
                tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-bg-weak-50)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0]?.payload as { label: string; images: number; imports: number }
                  return (
                    <div className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(14,18,27,0.12)]">
                      <p className="text-label-xs text-text-soft-400">{row.label}</p>
                      <p className="text-label-sm text-text-strong-950">
                        {row.images.toLocaleString('pt-BR')} imagens
                      </p>
                      <p className="text-paragraph-xs text-text-sub-600">
                        {row.imports.toLocaleString('pt-BR')} importações
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="images" fill="var(--color-information-base)" radius={[0, 5, 5, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  )
}
