'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DashboardData } from '@/types'
import PageHeader from '@/components/shell/PageHeader'
import StatWidget from '@/components/ds/StatWidget'
import WidgetCard from '@/components/ds/WidgetCard'
import * as Button from '@/components/ui/button'
import { RiPrinterLine } from '@remixicon/react'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function fmtPct(v: number | null) {
  if (v === null) return '—'
  return `${v.toFixed(1)}%`
}

function fmtHours(v: number) {
  return `${Math.round(v)}h`
}

function getMonthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`
  return { start, end }
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${names[m - 1]} ${y}`
}

function RelatorioContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [month, setMonth] = useState<string>(searchParams.get('month') ?? getCurrentMonth())
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (m: string) => {
    setLoading(true)
    setError(null)
    try {
      const { start, end } = getMonthBounds(m)
      const res = await fetch(`/api/dashboard?start=${start}&end=${end}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao carregar dados')
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(month)
  }, [month, fetchData])

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth)
    router.replace(`/relatorio?month=${newMonth}`)
  }

  const generatedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const clientPl = data ? data.pl.filter((p) => !p.isInternal) : []
  const totalRevenue = clientPl.reduce((s, p) => s + p.revenue, 0)
  const totalCost = data ? data.totalCostAllCollaborators : 0
  const netResult = totalRevenue - totalCost

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Relatório Mensal"
          actions={
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="rounded-10 border border-stroke-soft-200 bg-bg-white-0 px-3 py-1.5 text-paragraph-sm text-text-strong-950 focus:border-stroke-sub-300 focus:outline-none"
              />
              <Button.Root variant="primary" mode="filled" size="small" onClick={() => window.print()} disabled={loading}>
                <Button.Icon as={RiPrinterLine} />
                Imprimir PDF
              </Button.Root>
            </div>
          }
        />
      </div>

      <main className="flex flex-col gap-6 p-5 print:p-0">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="size-8 animate-spin rounded-full border-2 border-stroke-soft-200 border-t-text-strong-950" />
              <p className="text-paragraph-sm text-text-sub-600">Carregando dados...</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <WidgetCard className="mx-auto max-w-2xl text-center">
            <p className="text-label-md text-text-strong-950">Erro ao carregar dados</p>
            <p className="mt-1 text-paragraph-sm text-text-sub-600">{error}</p>
            <Button.Root variant="primary" mode="filled" size="small" className="mt-4" onClick={() => fetchData(month)}>
              Tentar novamente
            </Button.Root>
          </WidgetCard>
        )}

        {!loading && !error && data && (
          <div className="mx-auto max-w-4xl print:max-w-none print:px-0">
          {/* ── REPORT HEADER ── */}
          <div className="flex items-start justify-between mb-10 pb-8 border-b border-stroke-soft-200">
            <div>
              <img src="/mainnet-logo.svg" alt="Mainnet" className="h-8 w-auto mb-4" style={{ filter: 'invert(1)' }} />
              <h1 className="text-title-h4 mb-1">Relatório Mensal</h1>
              <p className="text-label-lg">{formatMonthLabel(month)}</p>
            </div>
            <div className="text-right">
              <p className="text-label-2xs mb-1">Gerado em</p>
              <p className="text-label-sm">{generatedDate}</p>
              <p className="text-paragraph-xs mt-1">{data.period.start} a {data.period.end}</p>
            </div>
          </div>

          <div className="mb-10 grid grid-cols-1 gap-4 print:grid-cols-3 md:grid-cols-3">
            <StatWidget label="Receita Total" value={<span className="text-success-base">{fmtBRL(totalRevenue)}</span>} delta={`${clientPl.length} projetos faturados`} />
            <StatWidget label="Custo Total" value={<span className="text-error-base">{fmtBRL(totalCost)}</span>} delta={`${data.collaborators.length} colaboradores`} deltaVariant="error" />
            <StatWidget
              label="Resultado Líquido"
              value={<span className={netResult >= 0 ? 'text-success-base' : 'text-error-base'}>{netResult >= 0 ? '+' : ''}{fmtBRL(netResult)}</span>}
              delta={netResult >= 0 ? 'superávit' : 'déficit'}
              deltaVariant={netResult >= 0 ? 'success' : 'error'}
            />
          </div>

          {/* ── TOP PROJETOS ── */}
          <section className="mb-10">
            <h2 className="text-label-md mb-4">Top Projetos</h2>
            <div className="bg-bg-white-0 border border-stroke-soft-200 overflow-hidden">
              <table className="w-full text-paragraph-sm">
                <thead>
                  <tr className="border-b border-stroke-soft-200 bg-bg-weak-50">
                    <th className="text-left px-5 py-3 text-label-2xs">Projeto</th>
                    <th className="text-right px-5 py-3 text-label-2xs">Horas</th>
                    <th className="text-right px-5 py-3 text-label-2xs">Receita</th>
                    <th className="text-right px-5 py-3 text-label-2xs">Custo</th>
                    <th className="text-right px-5 py-3 text-label-2xs">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {[...clientPl]
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((p, i) => (
                      <tr key={p.clockifyProjectId} className={`border-b border-stroke-soft-200 last:border-0 ${i % 2 === 1 ? 'bg-bg-soft-200' : ''}`}>
                        <td className="px-5 py-3">{p.clockifyProjectName}</td>
                        <td className="px-5 py-3 text-right" style={{ color: '#fa7319' }}>{fmtHours(p.hours)}</td>
                        <td className="px-5 py-3 text-right" style={{ color: '#1fc16b' }}>{p.revenue > 0 ? fmtBRL(p.revenue) : <span >—</span>}</td>
                        <td className="px-5 py-3 text-right" style={{ color: '#fb3748' }}>{fmtBRL(p.cost)}</td>
                        <td className="px-5 py-3 text-right" style={{ color: p.margin === null ? 'var(--color-text-soft-400)' : p.margin >= 40 ? '#1fc16b' : p.margin >= 20 ? '#f6b51e' : '#fb3748' }}>{fmtPct(p.margin)}</td>
                      </tr>
                    ))}
                  {clientPl.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-paragraph-sm">
                        Nenhum projeto com faturamento neste mês
                      </td>
                    </tr>
                  )}
                </tbody>
                {clientPl.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-stroke-soft-200 bg-bg-weak-50">
                      <td className="px-5 py-3 text-label-2xs">Total</td>
                      <td className="px-5 py-3 text-right text-label-sm" style={{ color: '#fa7319' }}>{fmtHours(clientPl.reduce((s, p) => s + p.hours, 0))}</td>
                      <td className="px-5 py-3 text-right text-label-sm" style={{ color: '#1fc16b' }}>{fmtBRL(totalRevenue)}</td>
                      <td className="px-5 py-3 text-right text-label-sm" style={{ color: '#fb3748' }}>{fmtBRL(totalCost)}</td>
                      <td className="px-5 py-3 text-right text-label-sm" style={{ color: totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100 >= 40 ? '#1fc16b' : ((totalRevenue - totalCost) / totalRevenue) * 100 >= 20 ? '#f6b51e' : '#fb3748') : 'var(--color-text-soft-400)' }}>
                        {totalRevenue > 0 ? fmtPct(((totalRevenue - totalCost) / totalRevenue) * 100) : '—'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          {/* ── CUSTO POR COLABORADOR ── */}
          <section className="mb-10">
            <h2 className="text-label-md mb-4">Custo por Colaborador</h2>
            <div className="bg-bg-white-0 border border-stroke-soft-200 overflow-hidden">
              {data.collaborators.length === 0 ? (
                <p className="px-5 py-6 text-center text-paragraph-sm">Nenhum dado de colaborador</p>
              ) : (
                <div className="divide-y divide-[var(--color-stroke-soft-200)]">
                  {[...data.collaborators]
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                          <span className="text-label-sm">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-6 text-paragraph-sm">
                          <span style={{ color: '#fa7319' }}>{fmtHours(c.totalHours)}</span>
                          <span className="w-24 text-right">{fmtBRL(c.totalCost)}</span>
                          <span className="text-paragraph-xs w-10 text-right">{c.percentOfTotal.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-bg-weak-50">
                    <span className="text-label-2xs">Total</span>
                    <div className="flex items-center gap-6 text-paragraph-sm">
                      <span style={{ color: '#fa7319' }}>{fmtHours(data.collaborators.reduce((s, c) => s + c.totalHours, 0))}</span>
                      <span className="w-24 text-right">{fmtBRL(totalCost)}</span>
                      <span className="text-paragraph-xs w-10 text-right" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── OBSERVAÇÕES ── */}
          <section className="mb-10 no-print">
            <h2 className="text-label-md mb-4">Observações</h2>
            <div className="bg-bg-white-0 border border-stroke-soft-200">
              <textarea
                rows={5}
                placeholder="Adicione notas manuais sobre este mês..."
                className="w-full px-5 py-4 text-paragraph-sm placeholder-[var(--color-stroke-sub-300)] bg-transparent resize-none focus:outline-none"
              />
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="border-t border-stroke-soft-200 pt-6 text-center">
            <p className="text-paragraph-xs">Gerado em {generatedDate} · Mainnet Design</p>
          </footer>
        </div>
        )}
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          div, section, td, th, p, span, h1, h2, h3 { background: white !important; color: black !important; border-color: #ebebeb !important; }
          @page { margin: 20mm; }
        }
      `}</style>
    </>
  )
}

export default function RelatorioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-paragraph-sm">Carregando relatório…</div>}>
      <RelatorioContent />
    </Suspense>
  )
}
