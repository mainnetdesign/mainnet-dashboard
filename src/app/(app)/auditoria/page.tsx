'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type TxStatus = 'matched' | 'unmatched' | 'ignored' | 'not-realized'

interface AuditTransaction {
  id: string
  name: string
  value: number
  predictedValue: number
  realized: boolean
  paymentDate: string | null
  extractedName: string | null
  matchedProject: string | null
  status: TxStatus
}

interface AuditSummary {
  totalRealizedRevenue: number
  totalMatchedRevenue: number
  totalIgnoredRevenue: number
  totalUnmatchedRevenue: number
  matchedCount: number
  unmatchedCount: number
  ignoredCount: number
  notRealizedCount: number
}

interface ProjectNoRevenue {
  name: string
  hours: number
}

interface ProjectNoHours {
  name: string
  revenue: number
}

interface AuditData {
  period: { start: string; end: string }
  clockifyProjects: string[]
  transactions: AuditTransaction[]
  periodTransactions: AuditTransaction[]
  summary: AuditSummary
  projectsWithNoRevenue: ProjectNoRevenue[]
  revenueProjectsNoHours: ProjectNoHours[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const STATUS_CONFIG: Record<TxStatus, { label: string; bg: string; text: string; dot: string }> = {
  matched:      { label: 'Vinculado',    bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  unmatched:    { label: 'Sem vínculo',  bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
  ignored:      { label: 'Ignorado',     bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400'   },
  'not-realized': { label: 'Não realizado', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
}

function StatusBadge({ status }: { status: TxStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(transactions: AuditTransaction[]) {
  const BOM = '﻿'
  const header = ['Data', 'Transação', 'Valor (R$)', 'Nome extraído', 'Projeto Clockify', 'Status'].join(';')
  const rows = transactions.map((tx) =>
    [
      fmtDate(tx.paymentDate),
      `"${tx.name.replace(/"/g, '""')}"`,
      tx.value,
      tx.extractedName ?? '—',
      tx.matchedProject ?? '—',
      STATUS_CONFIG[tx.status].label,
    ].join(';')
  )
  const csv = BOM + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `auditoria-transacoes.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold leading-tight mb-1 ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-sm text-gray-500">{sub}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DEFAULT_START = '2025-06-01'
const DEFAULT_END = new Date().toISOString().split('T')[0]

type FilterStatus = 'all' | TxStatus

export default function AuditoriaPage() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [showAllProjects, setShowAllProjects] = useState(false)

  const fetchData = useCallback(async (s: string, e: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/auditoria?start=${s}&end=${e}`)
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
    fetchData(start, end)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleApply() {
    fetchData(start, end)
  }

  // Filtered transaction list
  const visibleTx = (data?.periodTransactions ?? []).filter((tx) => {
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (
        !tx.name.toLowerCase().includes(q) &&
        !(tx.extractedName ?? '').toLowerCase().includes(q) &&
        !(tx.matchedProject ?? '').toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  const matchPct =
    data && data.summary.matchedCount + data.summary.unmatchedCount > 0
      ? Math.round(
          (data.summary.matchedCount /
            (data.summary.matchedCount + data.summary.unmatchedCount)) *
            100
        )
      : null

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-bold text-gray-900 text-lg">Auditoria</span>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Diagnóstico de transações · somente leitura</p>
            </div>
          </div>

          {/* Date range + apply */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="text-sm text-gray-700 outline-none bg-transparent"
              />
              <span className="text-gray-300 text-sm">→</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="text-sm text-gray-700 outline-none bg-transparent"
              />
            </div>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Carregando…' : 'Aplicar'}
            </button>
            {data && (
              <button
                onClick={() => exportCSV(data.periodTransactions)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 h-24" />
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 h-96" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-semibold mb-1">Erro ao carregar dados</p>
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={() => fetchData(start, end)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                label="Receita realizada"
                value={fmtBRL(data.summary.totalRealizedRevenue)}
                sub={`período ${data.period.start} → ${data.period.end}`}
              />
              <SummaryCard
                label="Receita vinculada"
                value={fmtBRL(data.summary.totalMatchedRevenue)}
                sub={`${data.summary.matchedCount} transações${matchPct !== null ? ` · ${matchPct}% de cobertura` : ''}`}
                accent="text-green-600"
              />
              <SummaryCard
                label="Sem vínculo"
                value={fmtBRL(data.summary.totalUnmatchedRevenue)}
                sub={`${data.summary.unmatchedCount} transações sem projeto`}
                accent={data.summary.unmatchedCount > 0 ? 'text-red-600' : 'text-gray-900'}
              />
              <SummaryCard
                label="Ignoradas / Não realizadas"
                value={`${data.summary.ignoredCount + data.summary.notRealizedCount}`}
                sub={`${data.summary.ignoredCount} ignoradas · ${data.summary.notRealizedCount} previstas`}
              />
            </div>

            {/* ── Match coverage bar ── */}
            {matchPct !== null && (
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mb-8">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">Cobertura de vínculo</p>
                  <p className="text-sm font-bold text-gray-900">{matchPct}%</p>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${matchPct}%`,
                      background: matchPct >= 80 ? '#10B981' : matchPct >= 50 ? '#F59E0B' : '#EF4444',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                  <span>{data.summary.matchedCount} vinculadas</span>
                  <span>{data.summary.unmatchedCount} sem vínculo</span>
                </div>
              </div>
            )}

            {/* ── Problems section ── */}
            {(data.projectsWithNoRevenue.length > 0 || data.revenueProjectsNoHours.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                {/* Projects with hours but no revenue */}
                {data.projectsWithNoRevenue.length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-50 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <h3 className="text-sm font-bold text-gray-800">Projetos sem receita no período</h3>
                      <span className="ml-auto text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {data.projectsWithNoRevenue.length}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {(showAllProjects ? data.projectsWithNoRevenue : data.projectsWithNoRevenue.slice(0, 8)).map((p) => (
                        <div key={p.name} className="flex items-center justify-between px-5 py-2.5">
                          <span className="text-sm text-gray-700 font-medium truncate">{p.name}</span>
                          <span className="text-xs text-gray-400 shrink-0 ml-2">{p.hours}h</span>
                        </div>
                      ))}
                      {data.projectsWithNoRevenue.length > 8 && (
                        <button
                          onClick={() => setShowAllProjects((v) => !v)}
                          className="w-full text-xs text-gray-400 hover:text-gray-600 py-2.5 text-center"
                        >
                          {showAllProjects ? 'Ver menos' : `+${data.projectsWithNoRevenue.length - 8} mais`}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Projects with revenue but no clockify hours */}
                {data.revenueProjectsNoHours.length > 0 && (
                  <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-50 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      <h3 className="text-sm font-bold text-gray-800">Receita sem horas no Clockify</h3>
                      <span className="ml-auto text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        {data.revenueProjectsNoHours.length}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {data.revenueProjectsNoHours.map((p) => (
                        <div key={p.name} className="flex items-center justify-between px-5 py-2.5">
                          <span className="text-sm text-gray-700 font-medium truncate">{p.name}</span>
                          <span className="text-xs font-semibold text-gray-700 shrink-0 ml-2">{fmtBRL(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Transaction table ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Transações do período</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{data.periodTransactions.length} transações no total</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Buscar…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 w-44"
                    />
                  </div>

                  {/* Status filter pills */}
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'matched', 'unmatched', 'ignored', 'not-realized'] as const).map((s) => {
                      const isAll = s === 'all'
                      const cfg = isAll ? null : STATUS_CONFIG[s]
                      const count = isAll
                        ? data.periodTransactions.length
                        : data.periodTransactions.filter((tx) => tx.status === s).length
                      return (
                        <button
                          key={s}
                          onClick={() => setFilterStatus(s)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            filterStatus === s
                              ? isAll
                                ? 'bg-gray-900 text-white border-gray-900'
                                : `${cfg!.bg} ${cfg!.text} border-current`
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {isAll ? 'Todas' : cfg!.label} ({count})
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Data</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">Transação (Notion)</th>
                      <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">Valor</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">Nome extraído</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">Projeto Clockify</th>
                      <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleTx.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-400 py-12 text-sm">
                          Nenhuma transação encontrada
                        </td>
                      </tr>
                    )}
                    {visibleTx.map((tx) => (
                      <tr
                        key={tx.id}
                        className={`hover:bg-gray-50 transition-colors ${tx.status === 'unmatched' ? 'bg-red-50/30' : ''}`}
                      >
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmtDate(tx.paymentDate)}</td>
                        <td className="px-3 py-3 text-gray-800 font-medium max-w-[260px]">
                          <span className="truncate block" title={tx.name}>{tx.name}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                          {fmtBRL(tx.value)}
                        </td>
                        <td className="px-3 py-3">
                          {tx.extractedName ? (
                            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {tx.extractedName}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {tx.matchedProject ? (
                            <span className="text-sm text-gray-700">{tx.matchedProject}</span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusBadge status={tx.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              {visibleTx.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span>{visibleTx.length} transações exibidas</span>
                  <span className="font-semibold text-gray-600">
                    Total: {fmtBRL(visibleTx.reduce((s, tx) => s + tx.value, 0))}
                  </span>
                </div>
              )}
            </div>

            {/* ── Clockify projects reference ── */}
            <details className="mt-6">
              <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors py-2 select-none">
                Projetos Clockify no período ({data.clockifyProjects.length})
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.clockifyProjects.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </details>
          </>
        )}
      </main>
    </div>
  )
}
