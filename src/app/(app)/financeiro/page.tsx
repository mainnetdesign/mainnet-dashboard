'use client'
import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { CHART_TOKENS, TOOLTIP_CARD } from '@/components/charts/chart-primitives'
import PageHeader from '@/components/shell/PageHeader'
import StudioPageActions from '@/components/studio/StudioPageActions'
import RunwayCard from '@/components/finance/RunwayCard'
import CircleCard from '@/components/finance/CircleCard'
import { StatWidget, WidgetCard } from '@/components/ds'
import type { FinanceData, LedgerEntry } from '@/types'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(v)
}

function fmtDate(d: string | null) {
  if (!d) return 'sem data'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-stroke-soft-200 ${className}`} />
}

const ChartTooltip = ({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className={`${TOOLTIP_CARD} min-w-[160px]`}>
      <p className="mb-1 text-label-xs text-text-soft-400">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6">
          <span className="text-paragraph-xs text-text-sub-600">{p.name}</span>
          <span className="text-label-xs text-text-strong-950">{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PendingRow({ entry }: { entry: LedgerEntry }) {
  const isIn = entry.type === 'Entrada'
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="truncate text-label-sm text-text-strong-950">{entry.name || '(sem nome)'}</p>
        <p className="text-paragraph-xs text-text-soft-400">{isIn ? 'a receber' : 'a pagar'} · {fmtDate(entry.date)}</p>
      </div>
      <p className={`shrink-0 text-label-sm ${isIn ? 'text-success-base' : 'text-error-base'}`}>
        {isIn ? '+' : '−'} {fmtBRL(entry.amount)}
      </p>
    </div>
  )
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    fetch('/api/financeiro')
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? `Erro ${res.status}`)
        setData(json)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro desconhecido'))
      .finally(() => setLoading(false))
  }, [reloadKey])

  const refresh = () => {
    setLoading(true); setError(null)
    setReloadKey((k) => k + 1)
  }

  const ready = !loading && data !== null
  const s = data?.summary
  const groups = [...new Set((data?.fixedCosts ?? []).map((c) => c.group))]
  const notionVariable = (data?.variableThisMonth ?? []).filter((e) => e.category !== 'Imposto')
  const variableTotal = notionVariable.reduce((acc, e) => acc + e.amount, 0)
  const pending = [...(data?.receivables ?? []), ...(data?.payables ?? [])]

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="quanto entra, quanto sai e quanto sobra"
        actions={<StudioPageActions loading={loading} onRefresh={refresh} />}
      />

      <main className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5">
        {error && (
          <WidgetCard className="border-error-light/40 bg-error-lighter/20">
            <p className="text-label-sm text-error-base">{error}</p>
          </WidgetCard>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {!ready || !s || !data
            ? (
              <>
                <Skeleton className="col-span-2 h-24 sm:col-span-1 sm:h-28" />
                <Skeleton className="h-24 sm:h-28" />
                <Skeleton className="h-24 sm:h-28" />
              </>
            )
            : (
              <>
                <StatWidget
                  className="min-w-0 p-4 sm:p-5"
                  label="Entra por mês"
                  value={<span className="text-title-h6 sm:text-title-h5">{fmtBRL(data.circle.monthlyNetBRL + s.mrrNetBRL)}</span>}
                />
                <StatWidget
                  className="min-w-0 p-4 sm:p-5"
                  label="Sai por mês"
                  value={<span className="text-title-h6 sm:text-title-h5">{fmtBRL(data.fixedTotal + variableTotal)}</span>}
                />
                <StatWidget
                  className="order-first col-span-2 min-w-0 p-4 sm:order-none sm:col-span-1 sm:p-5"
                  label="Sobra por mês"
                  value={
                    <span className={s.netBurn <= 0 ? 'text-success-base' : 'text-error-base'}>
                      {fmtBRL(-s.netBurn)}
                    </span>
                  }
                />
              </>
            )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {!ready || !data || !s ? (
            <>
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </>
          ) : (
            <>
              <CircleCard circle={data.circle} currentMonth={data.currentMonth} />
              <RunwayCard netBurn={s.netBurn} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <WidgetCard className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
            <p className="text-label-sm text-text-strong-950">Custos mensais</p>
            {!ready || !data ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="divide-y divide-stroke-soft-200">
                {groups.map((g) => {
                  const items = data.fixedCosts.filter((c) => c.group === g)
                  const total = items.reduce((acc, c) => acc + c.monthlyBRL, 0)
                  return (
                    <div key={g} className="flex items-center justify-between py-2 text-paragraph-sm">
                      <span className="text-text-sub-600">
                        {g}
                        {items.length > 1 && <span className="ml-1 text-text-soft-400">({items.length})</span>}
                      </span>
                      <span className="text-label-sm text-text-strong-950">{fmtBRL(total)}</span>
                    </div>
                  )
                })}
                {variableTotal > 0 && (
                  <div className="flex items-center justify-between py-2 text-paragraph-sm">
                    <span className="text-text-sub-600">Variáveis do mês (Notion)</span>
                    <span className="text-label-sm text-text-strong-950">{fmtBRL(variableTotal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3">
                  <span className="text-label-sm text-text-strong-950">Total</span>
                  <span className="text-label-md text-text-strong-950">{fmtBRL(data.fixedTotal + variableTotal)}</span>
                </div>
              </div>
            )}
          </WidgetCard>

          <WidgetCard className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-label-sm text-text-strong-950">Últimos meses</p>
              <div className="flex items-center gap-3 text-paragraph-xs text-text-sub-600">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: CHART_TOKENS.positive }} />Entrou
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: CHART_TOKENS.negative }} />Saiu
                </span>
              </div>
            </div>
            {!ready || !data ? (
              <Skeleton className="h-40" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.monthly} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={2}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-text-soft-400)' }}
                    axisLine={false} tickLine={false} tickMargin={6}
                    interval={0}
                    tickFormatter={(label: string) => label.split('/')[0]}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-bg-weak-50)' }} />
                  <Bar dataKey="revenue" name="Entrou" fill={CHART_TOKENS.positive} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="cost" name="Saiu" fill={CHART_TOKENS.negative} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </WidgetCard>
        </div>

        {ready && pending.length > 0 && (
          <WidgetCard className="flex flex-col gap-2 p-4 sm:p-5">
            <p className="text-label-sm text-text-strong-950">Pendências</p>
            <div className="divide-y divide-stroke-soft-200">
              {pending.map((e) => <PendingRow key={e.id} entry={e} />)}
            </div>
          </WidgetCard>
        )}
      </main>
    </>
  )
}
