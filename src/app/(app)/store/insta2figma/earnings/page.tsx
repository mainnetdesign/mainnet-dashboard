'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartGridLines,
  ChartCategoryAxis,
  ChartValueAxis,
  BarTooltip,
  ACTIVE_DOT,
  CHART_MARGIN,
  CHART_TOKENS,
} from '@/components/charts/chart-primitives'
import PageHeader from '@/components/shell/PageHeader'
import StatWidget from '@/components/ds/StatWidget'
import { DataTable, DataTableTextCell, WidgetCard } from '@/components/ds'
import { INSTA2FIGMA_MONTHLY_COSTS_USD } from '@/config/insta2figma'
import type { EarningsData } from '@/types/insta2figma'
import { fmtDate, fmtUSD } from '@/lib/insta2figma/constants'
import { subscriptionStatusLabel, txTypeLabel } from '@/lib/insta2figma/labels'

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/store/insta2figma/earnings')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const txColumns = useMemo(
    () => [
      {
        id: 'date',
        header: 'Data',
        width: 120,
        cell: (t: EarningsData['transactions'][0]) => (
          <DataTableTextCell>{fmtDate(t.date)}</DataTableTextCell>
        ),
      },
      {
        id: 'type',
        header: 'Tipo',
        width: 120,
        cell: (t: EarningsData['transactions'][0]) => (
          <DataTableTextCell>{txTypeLabel(t.type)}</DataTableTextCell>
        ),
      },
      {
        id: 'user',
        header: 'Usuário',
        width: 'flex' as const,
        cell: (t: EarningsData['transactions'][0]) => (
          <DataTableTextCell>{t.displayName ?? '—'}</DataTableTextCell>
        ),
      },
      {
        id: 'amount',
        header: 'Valor',
        width: 100,
        align: 'right' as const,
        cell: (t: EarningsData['transactions'][0]) => (
          <DataTableTextCell>{fmtUSD(t.amountUSD)}</DataTableTextCell>
        ),
      },
      {
        id: 'earnings',
        header: 'Receita',
        width: 100,
        align: 'right' as const,
        cell: (t: EarningsData['transactions'][0]) => (
          <DataTableTextCell strong>{fmtUSD(t.earningsUSD)}</DataTableTextCell>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 100,
        cell: (t: EarningsData['transactions'][0]) => (
          <DataTableTextCell>{subscriptionStatusLabel(t.status)}</DataTableTextCell>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <PageHeader title="Receitas" />
      <main className="flex flex-col gap-6 p-5">
        {error && <p className="text-paragraph-sm text-error-base">{error}</p>}

        {loading && !data && !error && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mn-shimmer h-36 rounded-2xl" />
              ))}
            </div>
            <div className="mn-shimmer h-64 rounded-2xl" />
            <div className="mn-shimmer h-96 rounded-2xl" />
          </div>
        )}

        {data && (
          <div className="mn-page-stagger flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatWidget label="Receita" value={fmtUSD(data.revenueUSD)} delta="+5%" />
              <StatWidget label="Custos" value={fmtUSD(data.costsUSD)} deltaVariant="error" />
              <StatWidget
                label="Líquido (P&L)"
                value={fmtUSD(data.netUSD)}
                deltaVariant={data.netUSD >= 0 ? 'success' : 'error'}
              />
            </div>

            <WidgetCard>
              <p className="mb-4 text-label-sm text-text-strong-950">Receita total</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.chart} margin={CHART_MARGIN}>
                    <ChartGridLines />
                    <ChartCategoryAxis dataKey="month" />
                    <ChartValueAxis />
                    <BarTooltip format={(v) => fmtUSD(Number(v ?? 0))} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill={CHART_TOKENS.info} name="Receita" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="costs" fill={CHART_TOKENS.negative} name="Custos" radius={[6, 6, 0, 0]} />
                    <Line
                      type="linear"
                      dataKey="net"
                      stroke={CHART_TOKENS.positive}
                      strokeWidth={2}
                      name="Líquido"
                      dot={false}
                      activeDot={ACTIVE_DOT(CHART_TOKENS.positive)}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <WidgetCard className="lg:col-span-1">
                <p className="mb-3 text-label-sm text-text-strong-950">Custos manuais</p>
                <div className="space-y-2">
                  {INSTA2FIGMA_MONTHLY_COSTS_USD.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-paragraph-sm">
                      <span className="text-text-sub-600">{c.label}</span>
                      <span className="text-text-strong-950">{fmtUSD(c.amountUSD)}/mês</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-paragraph-xs text-text-soft-400">
                  Fase 1 — lançamento manual. Integração Railway/Apify na fase 2.
                </p>
              </WidgetCard>

              <div className="lg:col-span-2">
                <p className="mb-3 text-label-sm text-text-strong-950">Transações</p>
                <DataTable
                  columns={txColumns}
                  data={data.transactions}
                  keyExtractor={(t) => t.id}
                  emptyMessage="Nenhuma transação no período"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
