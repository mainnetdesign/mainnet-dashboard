'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RiPrinterLine } from '@remixicon/react'
import PageHeader from '@/components/shell/PageHeader'
import { StatWidget, WidgetCard } from '@/components/ds'
import * as Button from '@/components/ui/button'
import type { ReportData, ReportLine } from '@/types'

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const SOURCE_LABELS: Record<ReportLine['source'], string> = {
  notion: 'Notion',
  polar: 'Polar',
  fixo: 'custo fixo',
  estimado: 'estimado',
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtUSD(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}`
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

function LinesTable({ title, lines, total, tone }: {
  title: string
  lines: ReportLine[]
  total: number
  tone: 'success' | 'error'
}) {
  return (
    <WidgetCard className="flex flex-col gap-3">
      <p className="text-label-sm text-text-strong-950">{title}</p>
      {lines.length === 0 ? (
        <p className="py-4 text-paragraph-sm text-text-soft-400">Nenhum lançamento neste mês</p>
      ) : (
        <div className="divide-y divide-stroke-soft-200">
          {lines.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-paragraph-sm text-text-strong-950">{l.label}</p>
                <p className="text-paragraph-xs text-text-soft-400">
                  {[l.date ? fmtDate(l.date) : null, SOURCE_LABELS[l.source], !l.realized && l.source === 'notion' ? 'pendente' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <p className="shrink-0 text-label-sm text-text-strong-950">{fmtBRL(l.amount)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3">
            <span className="text-label-sm text-text-strong-950">Total</span>
            <span className={`text-label-md ${tone === 'success' ? 'text-success-base' : 'text-error-base'}`}>
              {fmtBRL(total)}
            </span>
          </div>
        </div>
      )}
    </WidgetCard>
  )
}

function RelatorioContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [month, setMonth] = useState<string>(searchParams.get('month') ?? getCurrentMonth())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetch(`/api/relatorio?month=${month}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? `Erro ${res.status}`)
        setData(json)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro desconhecido'))
      .finally(() => setLoading(false))
  }, [month])

  function handleMonthChange(newMonth: string) {
    if (!newMonth) return
    setLoading(true); setError(null)
    setMonth(newMonth)
    router.replace(`/relatorio?month=${newMonth}`)
  }

  const generatedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const t = data?.totals

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Relatório"
          subtitle="fechamento financeiro do mês"
          actions={
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 text-paragraph-sm text-text-strong-950 focus:border-stroke-sub-300 focus:outline-none"
              />
              <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => window.print()} disabled={loading}>
                <Button.Icon as={RiPrinterLine} />
                PDF
              </Button.Root>
            </div>
          }
        />
      </div>

      <main className="flex flex-col gap-4 p-5 print:p-0">
        {error && (
          <WidgetCard className="border-error-light/40 bg-error-lighter/20">
            <p className="text-label-sm text-error-base">{error}</p>
          </WidgetCard>
        )}

        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 mn-page-stagger">
          <div className="flex items-end justify-between border-b border-stroke-soft-200 pb-5">
            <div>
              <p className="text-paragraph-xs text-text-soft-400">Mainnet Design · Relatório financeiro</p>
              <h1 className="mt-1 font-display text-title-h4 text-text-strong-950">{formatMonthLabel(month)}</h1>
            </div>
            <p className="text-paragraph-xs text-text-soft-400">
              {data?.isFuture ? 'projeção' : data?.isCurrent ? 'mês em andamento' : 'mês fechado'} · gerado em {generatedDate}
            </p>
          </div>

          {loading || !data || !t ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-stroke-soft-200" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 print:grid-cols-3">
                <StatWidget label="Entrou" value={fmtBRL(t.inflow)} />
                <StatWidget label="Saiu" value={fmtBRL(t.outflow)} />
                <StatWidget
                  label={t.margin !== null ? `Resultado · margem ${t.margin.toLocaleString('pt-BR')}%` : 'Resultado'}
                  value={<span className={t.result >= 0 ? 'text-success-base' : 'text-error-base'}>{fmtBRL(t.result)}</span>}
                />
              </div>

              <WidgetCard className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-label-sm text-text-strong-950">{data.circle.client}</p>
                  <p className="text-paragraph-xs text-text-soft-400">
                    esperado {fmtUSD(data.circle.expectedUSD)} ≈ {fmtBRL(data.circle.expectedBRL)} no mês
                  </p>
                </div>
                <p className="text-label-md text-text-strong-950">
                  {fmtBRL(data.circle.receivedBRL)}
                  <span className="ml-1 text-paragraph-xs text-text-soft-400">recebido</span>
                </p>
              </WidgetCard>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2">
                <LinesTable title="Entradas" lines={data.inflows} total={t.inflow} tone="success" />
                <LinesTable title="Saídas" lines={data.outflows} total={t.outflow} tone="error" />
              </div>
            </>
          )}

          <WidgetCard className="flex flex-col gap-2">
            <p className="text-label-sm text-text-strong-950">Observações</p>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre o mês (saem no PDF)…"
              className="w-full resize-none bg-transparent text-paragraph-sm text-text-strong-950 placeholder:text-text-soft-400 focus:outline-none"
            />
          </WidgetCard>

          <p className="pt-2 text-center text-paragraph-xs text-text-soft-400">
            Valores em reais · dólar a {data ? data.rate.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'} · Mainnet Design
          </p>
        </div>
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          div, section, td, th, p, span, h1, h2, h3, textarea { background: white !important; color: black !important; border-color: #ebebeb !important; }
          @page { margin: 16mm; }
        }
      `}</style>
    </>
  )
}

export default function RelatorioPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center text-paragraph-sm">Carregando relatório…</div>}>
      <RelatorioContent />
    </Suspense>
  )
}
