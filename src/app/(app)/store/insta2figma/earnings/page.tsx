'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

  useEffect(() => {
    fetch('/api/store/insta2figma/earnings')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
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

        {data && (
          <>
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
                  <ComposedChart data={data.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stroke-soft-200)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v) => fmtUSD(Number(v))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#335cff" name="Receita" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="costs" fill="#fb3748" name="Custos" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="net" stroke="#1fc16b" strokeWidth={2} name="Líquido" dot={false} />
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
          </>
        )}
      </main>
    </>
  )
}
