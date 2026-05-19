'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

type TxStatus = 'matched' | 'unmatched' | 'ignored' | 'not-realized'

interface AuditTransaction {
  id: string
  name: string
  value: number
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

interface Suggestion {
  txId: string
  txName: string
  txValue: number
  extractedName: string
  paymentDate: string | null
  suggestions: Array<{ project: string; score: number }>
}

interface MonthlyRow {
  ym: string
  label: string
  matched: number
  unmatched: number
  ignored: number
  notRealized: number
  total: number
  matchedValue: number
  unmatchedValue: number
}

interface DupGroup {
  transactions: Array<{ id: string; name: string; value: number; paymentDate: string | null; status: string }>
  value: number
  month: string
}

interface ImpliedRate {
  name: string
  revenue: number
  hours: number
  rate: number
  anomaly: boolean
}

interface OverdueTx {
  id: string
  name: string
  value: number
  paymentDate: string | null
  daysOverdue: number
}

interface AuditData {
  period: { start: string; end: string }
  clockifyProjects: string[]
  periodTransactions: AuditTransaction[]
  summary: AuditSummary
  projectsWithNoRevenue: Array<{ name: string; hours: number }>
  revenueProjectsNoHours: Array<{ name: string; revenue: number }>
  suggestions: Suggestion[]
  monthlyBreakdown: MonthlyRow[]
  duplicateGroups: DupGroup[]
  impliedRates: ImpliedRate[]
  overdueNotRealized: OverdueTx[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const STATUS_CFG: Record<TxStatus, { label: string; bg: string; text: string; color: string }> = {
  matched:        { label: 'Vinculado',     bg: 'bg-emerald-50',  text: 'text-emerald-700', color: '#10B981' },
  unmatched:      { label: 'Sem vínculo',   bg: 'bg-red-50',      text: 'text-red-700',     color: '#EF4444' },
  ignored:        { label: 'Ignorado',      bg: 'bg-gray-100',    text: 'text-gray-500',    color: '#9CA3AF' },
  'not-realized': { label: 'Não realizado', bg: 'bg-amber-50',    text: 'text-amber-700',   color: '#F59E0B' },
}

function Badge({ status }: { status: TxStatus }) {
  const c = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
      {c.label}
    </span>
  )
}

function SectionHeader({ label, title, count }: { label: string; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{label}</p>
      <div className="flex-1 h-px bg-gray-100" />
      <h2 className="text-sm font-bold text-gray-700 whitespace-nowrap">{title}</h2>
      {count !== undefined && (
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

function exportCSV(transactions: AuditTransaction[]) {
  const BOM = '﻿'
  const header = ['Data', 'Transação', 'Valor (R$)', 'Nome extraído', 'Projeto Clockify', 'Status'].join(';')
  const rows = transactions.map((tx) =>
    [fmtDate(tx.paymentDate), `"${tx.name.replace(/"/g, '""')}"`, tx.value,
     tx.extractedName ?? '—', tx.matchedProject ?? '—', STATUS_CFG[tx.status].label].join(';')
  )
  const blob = new Blob([BOM + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'auditoria.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Chart tooltips ───────────────────────────────────────────────────────────

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-xl text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.payload.color }} />
        <span className="text-gray-600">{p.name}</span>
        <span className="font-bold text-gray-900 ml-2">{p.value}</span>
      </div>
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xl text-sm min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.filter(p => p.value > 0).map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 flex-1 text-xs">{p.name}</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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
  const [showAllNoRevenue, setShowAllNoRevenue] = useState(false)
  const [expandSuggestions, setExpandSuggestions] = useState(false)

  const fetchData = useCallback(async (s: string, e: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/auditoria?start=${s}&end=${e}`)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'Erro') }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(DEFAULT_START, DEFAULT_END) }, []) // eslint-disable-line

  const matchPct = data
    ? data.summary.matchedCount + data.summary.unmatchedCount > 0
      ? Math.round(data.summary.matchedCount / (data.summary.matchedCount + data.summary.unmatchedCount) * 100)
      : null
    : null

  const visibleTx = (data?.periodTransactions ?? []).filter((tx) => {
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return tx.name.toLowerCase().includes(q)
        || (tx.extractedName ?? '').toLowerCase().includes(q)
        || (tx.matchedProject ?? '').toLowerCase().includes(q)
    }
    return true
  })

  // Action items
  const actions: string[] = []
  if (data) {
    if (data.summary.unmatchedCount > 0)
      actions.push(`${data.summary.unmatchedCount} transaç${data.summary.unmatchedCount > 1 ? 'ões' : 'ão'} sem vínculo (${fmtBRL(data.summary.totalUnmatchedRevenue)})`)
    if (data.duplicateGroups.length > 0)
      actions.push(`${data.duplicateGroups.length} grupo${data.duplicateGroups.length > 1 ? 's' : ''} de possíveis duplicatas`)
    if (data.overdueNotRealized.length > 0)
      actions.push(`${data.overdueNotRealized.length} recebimento${data.overdueNotRealized.length > 1 ? 's' : ''} previst${data.overdueNotRealized.length > 1 ? 'os' : 'o'} há mais de 30 dias`)
    if (data.impliedRates.filter(r => r.anomaly).length > 0)
      actions.push(`${data.impliedRates.filter(r => r.anomaly).length} project${data.impliedRates.filter(r => r.anomaly).length > 1 ? 'os' : 'o'} com taxa/h fora do padrão`)
  }

  return (
    <div>
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="font-bold text-gray-900 text-lg">Auditoria</span>
            <p className="text-xs text-gray-400 leading-none mt-0.5">Diagnóstico de transações · somente leitura</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
                className="text-sm text-gray-700 outline-none bg-transparent" />
              <span className="text-gray-300 text-sm">→</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)}
                className="text-sm text-gray-700 outline-none bg-transparent" />
            </div>
            <button onClick={() => fetchData(start, end)} disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">
              {loading ? 'Carregando…' : 'Aplicar'}
            </button>
            {data && (
              <button onClick={() => exportCSV(data.periodTransactions)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors">
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

        {/* Loading */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-gray-100 h-28" />)}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 h-64" />
            <div className="bg-white rounded-xl border border-gray-100 h-96" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-semibold mb-1">Erro ao carregar dados</p>
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={() => fetchData(start, end)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-10">

            {/* ── 1. Action summary ── */}
            {actions.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-6 h-6 bg-amber-400 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-amber-900">
                    {actions.length} {actions.length === 1 ? 'ponto requer atenção' : 'pontos requerem atenção'}
                  </p>
                </div>
                <ul className="space-y-1.5 ml-8">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="text-amber-400 mt-0.5 shrink-0">·</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── 2. KPI cards + coverage ── */}
            <div>
              <SectionHeader label="Visão geral" title="Resumo do período" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Receita realizada',   value: fmtBRL(data.summary.totalRealizedRevenue),  sub: `período selecionado`,                                  accent: '' },
                  { label: 'Receita vinculada',    value: fmtBRL(data.summary.totalMatchedRevenue),   sub: `${data.summary.matchedCount} transações${matchPct !== null ? ` · ${matchPct}% cobertura` : ''}`, accent: 'text-emerald-600' },
                  { label: 'Sem vínculo',          value: fmtBRL(data.summary.totalUnmatchedRevenue), sub: `${data.summary.unmatchedCount} transações`,             accent: data.summary.unmatchedCount > 0 ? 'text-red-600' : '' },
                  { label: 'Ignoradas / Previstas',value: `${data.summary.ignoredCount + data.summary.notRealizedCount}`, sub: `${data.summary.ignoredCount} ignoradas · ${data.summary.notRealizedCount} previstas`, accent: '' },
                ].map((c) => (
                  <div key={c.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{c.label}</p>
                    <p className={`text-2xl font-bold leading-tight mb-1 ${c.accent || 'text-gray-900'}`}>{c.value}</p>
                    <p className="text-xs text-gray-400">{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* Coverage bar */}
              {matchPct !== null && (
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">Cobertura de vínculo</p>
                    <p className="text-sm font-bold text-gray-900">{matchPct}%</p>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${matchPct}%`, background: matchPct >= 80 ? '#10B981' : matchPct >= 50 ? '#F59E0B' : '#EF4444' }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                    <span className="text-emerald-600 font-medium">{data.summary.matchedCount} vinculadas</span>
                    <span>{data.summary.ignoredCount} ignoradas</span>
                    <span className="text-red-500 font-medium">{data.summary.unmatchedCount} sem vínculo</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── 3. Charts: donut + monthly breakdown ── */}
            <div>
              <SectionHeader label="Análise visual" title="Distribuição e tendência mensal" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Donut */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <p className="text-sm font-bold text-gray-800 mb-1">Status das transações</p>
                  <p className="text-xs text-gray-400 mb-4">Distribuição por tipo no período</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Vinculado',     value: data.summary.matchedCount,     color: '#10B981' },
                          { name: 'Sem vínculo',   value: data.summary.unmatchedCount,   color: '#EF4444' },
                          { name: 'Ignorado',      value: data.summary.ignoredCount,     color: '#D1D5DB' },
                          { name: 'Não realizado', value: data.summary.notRealizedCount, color: '#F59E0B' },
                        ].filter((d) => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={88}
                        paddingAngle={3} dataKey="value"
                      >
                        {[
                          { name: 'Vinculado', value: data.summary.matchedCount, color: '#10B981' },
                          { name: 'Sem vínculo', value: data.summary.unmatchedCount, color: '#EF4444' },
                          { name: 'Ignorado', value: data.summary.ignoredCount, color: '#D1D5DB' },
                          { name: 'Não realizado', value: data.summary.notRealizedCount, color: '#F59E0B' },
                        ]
                          .filter((d) => d.value > 0)
                          .map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <RTooltip content={<PieTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                        formatter={(value) => <span style={{ color: '#6B7280' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly bar */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <p className="text-sm font-bold text-gray-800 mb-1">Transações por mês</p>
                  <p className="text-xs text-gray-400 mb-4">Vinculadas vs sem vínculo ao longo do tempo</p>
                  {data.monthlyBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.monthlyBreakdown} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <RTooltip content={<BarTooltip />} />
                        <Bar dataKey="matched"   name="Vinculado"     stackId="a" fill="#10B981" radius={[0,0,0,0]} />
                        <Bar dataKey="unmatched" name="Sem vínculo"   stackId="a" fill="#EF4444" radius={[0,0,0,0]} />
                        <Bar dataKey="ignored"   name="Ignorado"      stackId="a" fill="#E5E7EB" radius={[0,0,0,0]} />
                        <Bar dataKey="notRealized" name="Não realizado" stackId="a" fill="#FCD34D" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-sm text-gray-300">
                      Sem dados suficientes
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 4. Overdue not-realized ── */}
            {data.overdueNotRealized.length > 0 && (
              <div>
                <SectionHeader label="Recebimentos atrasados" title="Previstos há mais de 30 dias" count={data.overdueNotRealized.length} />
                <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {data.overdueNotRealized.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-amber-50/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{tx.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Previsto para {fmtDate(tx.paymentDate)}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 shrink-0">{fmtBRL(tx.value)}</span>
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                          {tx.daysOverdue}d atraso
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 bg-amber-50/60 border-t border-amber-100 flex justify-between text-xs text-amber-700 font-medium">
                    <span>{data.overdueNotRealized.length} recebimentos pendentes</span>
                    <span>{fmtBRL(data.overdueNotRealized.reduce((s, t) => s + t.value, 0))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 5. Duplicates ── */}
            {data.duplicateGroups.length > 0 && (
              <div>
                <SectionHeader label="Possíveis duplicatas" title="Mesmo valor e nome no mesmo mês" count={data.duplicateGroups.length} />
                <div className="space-y-3">
                  {data.duplicateGroups.map((group, gi) => (
                    <div key={gi} className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                        <p className="text-xs font-semibold text-red-600">
                          {group.transactions.length} transações · {group.month} · {fmtBRL(group.value)} cada
                        </p>
                        <span className="text-xs text-red-400">Verifique no Notion</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {group.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center gap-4 px-5 py-2.5">
                            <p className="flex-1 text-sm text-gray-700 truncate">{tx.name}</p>
                            <span className="text-xs text-gray-400 shrink-0">{fmtDate(tx.paymentDate)}</span>
                            <Badge status={tx.status as TxStatus} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 6. Implied rates ── */}
            {data.impliedRates.length > 0 && (
              <div>
                <SectionHeader label="Taxa implícita" title="Receita ÷ horas por projeto" count={data.impliedRates.length} />
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Avg reference */}
                  {(() => {
                    const avg = Math.round(data.impliedRates.reduce((s, r) => s + r.rate, 0) / data.impliedRates.length)
                    return (
                      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Taxa média: <strong className="text-gray-700">R${avg}/h</strong></span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-orange-400" /> anomalia = fora de 25–250% da média
                        </span>
                      </div>
                    )
                  })()}
                  <div className="divide-y divide-gray-50">
                    {data.impliedRates.map((r) => {
                      const maxRate = Math.max(...data.impliedRates.map(x => x.rate))
                      const pct = maxRate > 0 ? (r.rate / maxRate) * 100 : 0
                      return (
                        <div key={r.name} className={`px-5 py-3 hover:bg-gray-50 transition-colors ${r.anomaly ? 'bg-orange-50/30' : ''}`}>
                          <div className="flex items-center gap-4 mb-1.5">
                            <p className="text-sm font-medium text-gray-800 flex-1 truncate">{r.name}</p>
                            <span className="text-xs text-gray-400 shrink-0">{r.hours}h</span>
                            <span className="text-xs text-gray-400 shrink-0">{fmtBRL(r.revenue)}</span>
                            <span className={`text-sm font-bold shrink-0 ${r.anomaly ? 'text-orange-600' : 'text-gray-900'}`}>
                              R${r.rate}/h
                            </span>
                            {r.anomaly && (
                              <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full shrink-0">
                                ⚠ fora do padrão
                              </span>
                            )}
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.anomaly ? '#FB923C' : '#6366F1' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── 7. Project problems ── */}
            {(data.projectsWithNoRevenue.length > 0 || data.revenueProjectsNoHours.length > 0) && (
              <div>
                <SectionHeader label="Inconsistências de projeto" title="Horas sem receita · Receita sem horas" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.projectsWithNoRevenue.length > 0 && (
                    <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-amber-50 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">Horas sem receita</p>
                          <p className="text-xs text-gray-400 mt-0.5">Clockify sem transação no Notion</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {data.projectsWithNoRevenue.length}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {(showAllNoRevenue ? data.projectsWithNoRevenue : data.projectsWithNoRevenue.slice(0, 8))
                          .map((p) => (
                            <div key={p.name} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors">
                              <span className="text-sm text-gray-700 truncate">{p.name}</span>
                              <span className="text-xs font-medium text-gray-400 shrink-0 ml-2">{p.hours}h</span>
                            </div>
                          ))}
                        {data.projectsWithNoRevenue.length > 8 && (
                          <button onClick={() => setShowAllNoRevenue(v => !v)}
                            className="w-full text-xs text-gray-400 hover:text-gray-600 py-2.5 text-center transition-colors">
                            {showAllNoRevenue ? 'Ver menos' : `+${data.projectsWithNoRevenue.length - 8} projetos`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {data.revenueProjectsNoHours.length > 0 && (
                    <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-red-50 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">Receita sem horas</p>
                          <p className="text-xs text-gray-400 mt-0.5">Notion sem registro no Clockify</p>
                        </div>
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          {data.revenueProjectsNoHours.length}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {data.revenueProjectsNoHours.map((p) => (
                          <div key={p.name} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors">
                            <span className="text-sm text-gray-700 truncate">{p.name}</span>
                            <span className="text-xs font-semibold text-gray-700 shrink-0 ml-2">{fmtBRL(p.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 8. Match suggestions ── */}
            {data.suggestions.length > 0 && (
              <div>
                <SectionHeader label="Sugestões de vínculo" title="Projetos parecidos para transações sem vínculo" count={data.suggestions.length} />
                <div className={`space-y-2 ${!expandSuggestions ? 'max-h-96 overflow-hidden relative' : ''}`}>
                  {data.suggestions.map((s) => (
                    <div key={s.txId} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{s.txName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {fmtDate(s.paymentDate)} · {fmtBRL(s.txValue)} · nome extraído:{' '}
                            <span className="font-mono bg-gray-100 px-1 rounded text-gray-600">{s.extractedName}</span>
                          </p>
                        </div>
                        <Badge status="unmatched" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-gray-400 self-center">Projetos próximos:</span>
                        {s.suggestions.map((sg) => (
                          <span key={sg.project}
                            className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">
                            {sg.project}
                            <span className="text-indigo-400">{Math.round(sg.score * 100)}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!expandSuggestions && data.suggestions.length > 3 && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
                  )}
                </div>
                {data.suggestions.length > 3 && (
                  <button onClick={() => setExpandSuggestions(v => !v)}
                    className="mt-3 w-full text-xs font-medium text-gray-400 hover:text-gray-700 py-2 border border-gray-200 rounded-xl bg-white transition-colors">
                    {expandSuggestions ? 'Ver menos' : `Ver todas as ${data.suggestions.length} sugestões`}
                  </button>
                )}
              </div>
            )}

            {/* ── 9. Transaction table ── */}
            <div>
              <SectionHeader label="Detalhe" title="Todas as transações do período" count={data.periodTransactions.length} />
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Filters */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'matched', 'unmatched', 'ignored', 'not-realized'] as const).map((s) => {
                      const isAll = s === 'all'
                      const count = isAll
                        ? data.periodTransactions.length
                        : data.periodTransactions.filter((tx) => tx.status === s).length
                      const cfg = isAll ? null : STATUS_CFG[s]
                      return (
                        <button key={s} onClick={() => setFilterStatus(s)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            filterStatus === s
                              ? isAll ? 'bg-gray-900 text-white border-gray-900' : `${cfg!.bg} ${cfg!.text} border-current`
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                          }`}>
                          {isAll ? 'Todas' : cfg!.label} ({count})
                        </button>
                      )
                    })}
                  </div>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 w-44" />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Data', 'Transação (Notion)', 'Valor', 'Nome extraído', 'Projeto Clockify', 'Status'].map((h, i) => (
                          <th key={h} className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 ${i >= 2 && i < 4 ? 'px-3' : ''} ${i === 2 ? 'text-right' : 'text-left'} ${i === 5 ? 'text-center' : ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {visibleTx.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-gray-300 py-16 text-sm">Nenhuma transação encontrada</td></tr>
                      )}
                      {visibleTx.map((tx) => (
                        <tr key={tx.id} className={`hover:bg-gray-50 transition-colors ${tx.status === 'unmatched' ? 'bg-red-50/20' : ''}`}>
                          <td className="px-5 py-3 text-gray-400 whitespace-nowrap text-xs">{fmtDate(tx.paymentDate)}</td>
                          <td className="px-5 py-3 font-medium text-gray-800 max-w-[240px]">
                            <span className="truncate block" title={tx.name}>{tx.name}</span>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{fmtBRL(tx.value)}</td>
                          <td className="px-3 py-3">
                            {tx.extractedName
                              ? <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tx.extractedName}</span>
                              : <span className="text-gray-200 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700">{tx.matchedProject ?? <span className="text-gray-200 text-xs">—</span>}</td>
                          <td className="px-5 py-3 text-center"><Badge status={tx.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                {visibleTx.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span>{visibleTx.length} transações</span>
                    <span className="font-semibold text-gray-600">{fmtBRL(visibleTx.reduce((s, tx) => s + tx.value, 0))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 10. Clockify reference (collapsible) ── */}
            <details className="group">
              <summary className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors py-2 select-none list-none">
                <svg className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Projetos Clockify no período ({data.clockifyProjects.length})
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.clockifyProjects.map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-500 hover:border-gray-400 transition-colors">
                    {p}
                  </span>
                ))}
              </div>
            </details>

          </div>
        )}
      </main>
    </div>
  )
}
