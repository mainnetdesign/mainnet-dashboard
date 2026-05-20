'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DashboardData } from '@/types'

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
    <div className="min-h-screen bg-gray-50">
      {/* No-print controls bar */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Mainnet" className="h-6 w-auto" />
          <span className="text-sm font-semibold text-gray-600">Relatório Mensal</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mês</label>
          <input
            type="month"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <button
            onClick={() => window.print()}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir PDF
          </button>
        </div>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500">Carregando dados...</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="max-w-2xl mx-auto py-16 px-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-semibold mb-1">Erro ao carregar dados</p>
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={() => fetchData(month)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <div className="max-w-4xl mx-auto px-8 py-10 print:px-0 print:py-0">
          {/* ── REPORT HEADER ── */}
          <div className="flex items-start justify-between mb-10 pb-8 border-b border-gray-200">
            <div>
              <img src="/logo.svg" alt="Mainnet" className="h-8 w-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Relatório Mensal</h1>
              <p className="text-lg text-gray-500 font-medium">{formatMonthLabel(month)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Gerado em</p>
              <p className="text-sm font-medium text-gray-600">{generatedDate}</p>
              <p className="text-xs text-gray-400 mt-1">
                {data.period.start} a {data.period.end}
              </p>
            </div>
          </div>

          {/* ── KPI ROW ── */}
          <div className="grid grid-cols-3 gap-5 mb-10">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Receita Total
              </p>
              <p className="text-3xl font-bold text-gray-900 leading-tight">{fmtBRL(totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">{clientPl.length} projeto{clientPl.length !== 1 ? 's' : ''} faturados</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Custo Total
              </p>
              <p className="text-3xl font-bold text-gray-900 leading-tight">{fmtBRL(totalCost)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.collaborators.length} colaboradores</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Resultado Líquido
              </p>
              <p className={`text-3xl font-bold leading-tight ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netResult >= 0 ? '+' : ''}{fmtBRL(netResult)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{netResult >= 0 ? 'superávit' : 'déficit'}</p>
            </div>
          </div>

          {/* ── TOP PROJETOS ── */}
          <section className="mb-10">
            <h2 className="text-base font-bold text-gray-900 mb-4">Top Projetos</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projeto</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Horas</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Receita</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Custo</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {[...clientPl]
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((p, i) => (
                      <tr
                        key={p.clockifyProjectId}
                        className={`border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                      >
                        <td className="px-5 py-3 font-medium text-gray-800">{p.clockifyProjectName}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{fmtHours(p.hours)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">{p.revenue > 0 ? fmtBRL(p.revenue) : '—'}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{fmtBRL(p.cost)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${p.margin !== null && p.margin >= 30 ? 'text-green-600' : p.margin !== null && p.margin < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {fmtPct(p.margin)}
                        </td>
                      </tr>
                    ))}
                  {clientPl.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">
                        Nenhum projeto com faturamento neste mês
                      </td>
                    </tr>
                  )}
                </tbody>
                {clientPl.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="px-5 py-3 text-xs font-bold text-gray-500 uppercase">Total</td>
                      <td className="px-5 py-3 text-right text-xs font-bold text-gray-700">
                        {fmtHours(clientPl.reduce((s, p) => s + p.hours, 0))}
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-bold text-gray-900">{fmtBRL(totalRevenue)}</td>
                      <td className="px-5 py-3 text-right text-xs font-bold text-gray-700">{fmtBRL(totalCost)}</td>
                      <td className="px-5 py-3 text-right text-xs font-bold text-gray-700">
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
            <h2 className="text-base font-bold text-gray-900 mb-4">Custo por Colaborador</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {data.collaborators.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-gray-400">Nenhum dado de colaborador</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {[...data.collaborators]
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: c.color }}
                          />
                          <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-gray-500">{fmtHours(c.totalHours)}</span>
                          <span className="font-semibold text-gray-900 w-24 text-right">{fmtBRL(c.totalCost)}</span>
                          <span className="text-xs text-gray-400 w-10 text-right">{c.percentOfTotal.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wide text-xs">Total</span>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-gray-500">
                        {fmtHours(data.collaborators.reduce((s, c) => s + c.totalHours, 0))}
                      </span>
                      <span className="font-bold text-gray-900 w-24 text-right">{fmtBRL(totalCost)}</span>
                      <span className="text-xs text-gray-400 w-10 text-right" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── OBSERVAÇÕES ── */}
          <section className="mb-10 no-print">
            <h2 className="text-base font-bold text-gray-900 mb-4">Observações</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <textarea
                rows={5}
                placeholder="Adicione notas manuais sobre este mês..."
                className="w-full px-5 py-4 text-sm text-gray-700 placeholder-gray-300 bg-transparent resize-none focus:outline-none rounded-2xl"
              />
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="border-t border-gray-200 pt-6 text-center">
            <p className="text-xs text-gray-400">
              Gerado em {generatedDate} · Mainnet Design
            </p>
          </footer>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { margin: 20mm; }
        }
      `}</style>
    </div>
  )
}

export default function RelatorioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400 text-sm">Carregando relatório…</div>}>
      <RelatorioContent />
    </Suspense>
  )
}
