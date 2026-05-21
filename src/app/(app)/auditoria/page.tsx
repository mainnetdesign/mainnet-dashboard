'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

type TxStatus = 'matched' | 'unmatched' | 'ignored' | 'not-realized'

interface AuditTransaction {
  id: string; name: string; value: number; realized: boolean
  paymentDate: string | null; extractedName: string | null
  matchedProject: string | null; status: TxStatus
}
interface AuditSummary {
  totalRealizedRevenue: number; totalMatchedRevenue: number
  totalIgnoredRevenue: number; totalUnmatchedRevenue: number
  matchedCount: number; unmatchedCount: number; ignoredCount: number; notRealizedCount: number
}
interface Suggestion {
  txId: string; txName: string; txValue: number; extractedName: string
  paymentDate: string | null; suggestions: Array<{ project: string; score: number }>
}
interface MonthlyRow {
  ym: string; label: string; matched: number; unmatched: number
  ignored: number; notRealized: number; total: number; matchedValue: number; unmatchedValue: number
}
interface DupGroup {
  transactions: Array<{ id: string; name: string; value: number; paymentDate: string | null; status: string }>
  value: number; month: string
}
interface ImpliedRate { name: string; revenue: number; hours: number; rate: number; anomaly: boolean }
interface OverdueTx { id: string; name: string; value: number; paymentDate: string | null; daysOverdue: number }
interface AuditData {
  period: { start: string; end: string }; clockifyProjects: string[]
  periodTransactions: AuditTransaction[]; summary: AuditSummary
  projectsWithNoRevenue: Array<{ name: string; hours: number }>
  revenueProjectsNoHours: Array<{ name: string; revenue: number }>
  suggestions: Suggestion[]; monthlyBreakdown: MonthlyRow[]
  duplicateGroups: DupGroup[]; impliedRates: ImpliedRate[]; overdueNotRealized: OverdueTx[]
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}
function fmtDate(s: string | null) {
  if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`
}

const STATUS_CFG_BASE = {
  matched:        { label: 'Vinculado',     borderClass: 'border-[#22C55E]/50',  textClass: 'text-[#22C55E]'  },
  unmatched:      { label: 'Sem vínculo',   borderClass: 'border-[#F87171]/50',  textClass: 'text-[#F87171]' },
  ignored:        { label: 'Ignorado',      borderClass: 'border-[#9CA3AF]/50',  textClass: 'text-[#9CA3AF]' },
  'not-realized': { label: 'Não realizado', borderClass: 'border-[#FBBF24]/50',  textClass: 'text-[#FBBF24]' },
}

const STATUS_CHART_COLORS = {
  matched:        '#22C55E',
  unmatched:      '#F87171',
  ignored:        '#9CA3AF',
  'not-realized': '#FBBF24',
}

function useStatusCfg() {
  return {
    matched:        { ...STATUS_CFG_BASE.matched,        color: STATUS_CHART_COLORS.matched },
    unmatched:      { ...STATUS_CFG_BASE.unmatched,      color: STATUS_CHART_COLORS.unmatched },
    ignored:        { ...STATUS_CFG_BASE.ignored,        color: STATUS_CHART_COLORS.ignored },
    'not-realized': { ...STATUS_CFG_BASE['not-realized'], color: STATUS_CHART_COLORS['not-realized'] },
  }
}

function Badge({ status }: { status: TxStatus }) {
  const c = STATUS_CFG_BASE[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-semibold ${c.borderClass} ${c.textClass}`}>
      {c.label}
    </span>
  )
}

function SectionHeader({ label, title, count }: { label: string; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[10px] font-bold text-[var(--tx3)] uppercase tracking-widest whitespace-nowrap">{label}</p>
      <div className="flex-1 h-px bg-[var(--bd)]" />
      <h2 className="text-sm font-bold text-[var(--tx)] whitespace-nowrap">{title}</h2>
      {count !== undefined && (
        <span className="text-xs font-semibold border px-2 py-0.5" style={{ color: '#60A5FA', borderColor: '#60A5FA44' }}>{count}</span>
      )}
    </div>
  )
}

function exportCSV(transactions: AuditTransaction[]) {
  const BOM = '﻿'
  const header = ['Data', 'Transação', 'Valor (R$)', 'Nome extraído', 'Projeto Clockify', 'Status'].join(';')
  const rows = transactions.map((tx) =>
    [fmtDate(tx.paymentDate), `"${tx.name.replace(/"/g, '""')}"`, tx.value,
     tx.extractedName ?? '—', tx.matchedProject ?? '—', STATUS_CFG_BASE[tx.status].label].join(';')
  )
  const blob = new Blob([BOM + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'auditoria.csv'; a.click()
  URL.revokeObjectURL(url)
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)] px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.payload.color }} />
        <span className="text-[var(--tx2)]">{p.name}</span>
        <span className="font-bold text-[var(--tx)] ml-2">{p.value}</span>
      </div>
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)] p-3 text-sm min-w-[140px]">
      <p className="font-semibold text-[var(--tx)] mb-2">{label}</p>
      {payload.filter(p => p.value > 0).map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[var(--tx2)] flex-1 text-xs">{p.name}</span>
          <span className="font-semibold text-[var(--tx)]">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

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
  const { theme } = useTheme()
  const STATUS_CFG = useStatusCfg()

  const fetchData = useCallback(async (s: string, e: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/auditoria?start=${s}&end=${e}`)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'Erro') }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally { setLoading(false) }
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
      return tx.name.toLowerCase().includes(q) || (tx.extractedName ?? '').toLowerCase().includes(q) || (tx.matchedProject ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const actions: string[] = []
  if (data) {
    if (data.summary.unmatchedCount > 0)
      actions.push(`${data.summary.unmatchedCount} transaç${data.summary.unmatchedCount > 1 ? 'ões' : 'ão'} sem vínculo (${fmtBRL(data.summary.totalUnmatchedRevenue)})`)
    if (data.duplicateGroups.length > 0)
      actions.push(`${data.duplicateGroups.length} grupo${data.duplicateGroups.length > 1 ? 's' : ''} de possíveis duplicatas`)
    if (data.overdueNotRealized.length > 0)
      actions.push(`${data.overdueNotRealized.length} recebimento${data.overdueNotRealized.length > 1 ? 's' : ''} previst${data.overdueNotRealized.length > 1 ? 'os' : 'o'} há mais de 30 dias`)
    if (data.impliedRates.filter(r => r.anomaly).length > 0)
      actions.push(`${data.impliedRates.filter(r => r.anomaly).length} projeto${data.impliedRates.filter(r => r.anomaly).length > 1 ? 's' : ''} com taxa/h fora do padrão`)
  }

  return (
    <div>
      {/* ── Header ── */}
      <header className="bg-[var(--bg)] border-b border-[var(--bd)] sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="font-bold text-[var(--tx)] text-lg">Auditoria</span>
            <p className="text-[11px] text-[var(--tx3)] leading-none mt-0.5 uppercase tracking-wider">Diagnóstico de transações · somente leitura</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-[var(--bd)] px-3 py-1.5 bg-[var(--bg3)]">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
                className="text-sm text-[var(--tx)] outline-none bg-transparent" style={{ colorScheme: 'dark' }} />
              <span className="text-[var(--bd3)] text-sm">→</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)}
                className="text-sm text-[var(--tx)] outline-none bg-transparent" style={{ colorScheme: 'dark' }} />
            </div>
            <button onClick={() => fetchData(start, end)} disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-[var(--inv)] text-[var(--inv-tx)] hover:opacity-80 disabled:opacity-40 transition-colors">
              {loading ? 'Carregando…' : 'Aplicar'}
            </button>
            {data && (
              <button onClick={() => exportCSV(data.periodTransactions)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[var(--bd)] text-[var(--tx2)] hover:border-[var(--bd3)] hover:text-[var(--tx)] transition-colors">
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

        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border border-[var(--bd)]">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-[var(--bg3)] h-28" />)}
            </div>
            <div className="bg-[var(--bg3)] border border-[var(--bd)] h-64" />
            <div className="bg-[var(--bg3)] border border-[var(--bd)] h-96" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-[var(--bg3)] border border-[var(--bd)] p-6 text-center">
            <p className="text-[var(--tx)] font-semibold mb-1">Erro ao carregar dados</p>
            <p className="text-[var(--tx2)] text-sm">{error}</p>
            <button onClick={() => fetchData(start, end)}
              className="mt-4 px-4 py-2 bg-white text-black text-sm hover:opacity-80 transition-colors">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-10">

            {/* ── 1. Action summary ── */}
            {actions.length > 0 && (
              <div className="p-5 border" style={{ background: '#FBBF2420', borderColor: '#FBBF2466' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0" style={{ background: '#FBBF2422' }}>
                    <svg className="w-3.5 h-3.5" style={{ color: '#FBBF24' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#FBBF24' }}>
                    {actions.length} {actions.length === 1 ? 'ponto requer atenção' : 'pontos requerem atenção'}
                  </p>
                </div>
                <ul className="space-y-1.5 ml-8">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-bold text-[var(--tx)]">
                      <span className="mt-0.5 shrink-0" style={{ color: '#FBBF24' }}>·</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── 2. KPI cards + coverage ── */}
            <div>
              <SectionHeader label="Visão geral" title="Resumo do período" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-4 border border-[var(--bd)]">
                {[
                  { label: 'Receita realizada',    value: fmtBRL(data.summary.totalRealizedRevenue),  sub: 'período selecionado',                                                                                    color: '#22C55E' },
                  { label: 'Receita vinculada',     value: fmtBRL(data.summary.totalMatchedRevenue),   sub: `${data.summary.matchedCount} transações${matchPct !== null ? ` · ${matchPct}% cobertura` : ''}`,         color: '#22C55E' },
                  { label: 'Sem vínculo',           value: fmtBRL(data.summary.totalUnmatchedRevenue), sub: `${data.summary.unmatchedCount} transações`,                                                              color: '#F87171' },
                  { label: 'Ignoradas / Previstas', value: `${data.summary.ignoredCount + data.summary.notRealizedCount}`, sub: `${data.summary.ignoredCount} ignoradas · ${data.summary.notRealizedCount} previstas`, color: '#9CA3AF' },
                ].map((c) => (
                  <div key={c.label} className="bg-[var(--bg3)] p-5">
                    <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">{c.label}</p>
                    <p className="text-2xl font-bold leading-tight mb-1" style={{ color: c.color }}>{c.value}</p>
                    <p className="text-xs text-[var(--tx3)]">{c.sub}</p>
                  </div>
                ))}
              </div>

              {matchPct !== null && (
                <div className="bg-[var(--bg3)] p-5 border border-[var(--bd)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-[var(--tx)]">Cobertura de vínculo</p>
                    <p className="text-sm font-bold text-[var(--tx)]">{matchPct}%</p>
                  </div>
                  <div className="w-full h-2 bg-[var(--bd)] overflow-hidden flex">
                    {(() => {
                      const total = data.summary.matchedCount + data.summary.unmatchedCount + data.summary.ignoredCount
                      const mPct = total > 0 ? (data.summary.matchedCount / total) * 100 : 0
                      const iPct = total > 0 ? (data.summary.ignoredCount / total) * 100 : 0
                      const uPct = total > 0 ? (data.summary.unmatchedCount / total) * 100 : 0
                      return (<>
                        <div className="h-full transition-all duration-700" style={{ width: `${mPct}%`, background: '#22C55E' }} />
                        <div className="h-full transition-all duration-700" style={{ width: `${iPct}%`, background: '#9CA3AF' }} />
                        <div className="h-full transition-all duration-700" style={{ width: `${uPct}%`, background: '#F87171' }} />
                      </>)
                    })()}
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs">
                    <span style={{ color: '#22C55E' }} className="font-medium">{data.summary.matchedCount} vinculadas</span>
                    <span style={{ color: '#9CA3AF' }}>{data.summary.ignoredCount} ignoradas</span>
                    <span style={{ color: '#F87171' }} className="font-medium">{data.summary.unmatchedCount} sem vínculo</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── 3. Charts ── */}
            <div>
              <SectionHeader label="Análise visual" title="Distribuição e tendência mensal" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-px border border-[var(--bd)]">
                <div className="bg-[var(--bg3)] p-6">
                  <p className="text-sm font-bold text-[var(--tx)] mb-1">Status das transações</p>
                  <p className="text-xs text-[var(--tx3)] mb-4">Distribuição por tipo no período</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Vinculado',     value: data.summary.matchedCount,     color: STATUS_CFG.matched.color },
                          { name: 'Sem vínculo',   value: data.summary.unmatchedCount,   color: STATUS_CFG.unmatched.color },
                          { name: 'Ignorado',      value: data.summary.ignoredCount,     color: STATUS_CFG.ignored.color },
                          { name: 'Não realizado', value: data.summary.notRealizedCount, color: STATUS_CFG['not-realized'].color },
                        ].filter((d) => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={88} paddingAngle={3} dataKey="value"
                      >
                        {[
                          { name: 'Vinculado',     value: data.summary.matchedCount,     color: STATUS_CFG.matched.color },
                          { name: 'Sem vínculo',   value: data.summary.unmatchedCount,   color: STATUS_CFG.unmatched.color },
                          { name: 'Ignorado',      value: data.summary.ignoredCount,     color: STATUS_CFG.ignored.color },
                          { name: 'Não realizado', value: data.summary.notRealizedCount, color: STATUS_CFG['not-realized'].color },
                        ].filter((d) => d.value > 0).map((entry) => <Cell key={entry.name} fill={entry.color} stroke="var(--bg3)" />)}
                      </Pie>
                      <RTooltip content={<PieTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={(value) => <span style={{ color: theme === 'dark' ? '#999999' : '#555555' }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-[var(--bg3)] p-6">
                  <p className="text-sm font-bold text-[var(--tx)] mb-1">Transações por mês</p>
                  <p className="text-xs text-[var(--tx3)] mb-4">Vinculadas vs sem vínculo ao longo do tempo</p>
                  {data.monthlyBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.monthlyBreakdown} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#222222' : '#E8E8E8'} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme === 'dark' ? '#666666' : '#888888' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#666666' : '#888888' }} axisLine={false} tickLine={false} />
                        <RTooltip content={<BarTooltip />} />
                        <Bar dataKey="matched"     name="Vinculado"     stackId="a" fill={STATUS_CFG.matched.color}        radius={[0,0,0,0]} />
                        <Bar dataKey="unmatched"   name="Sem vínculo"   stackId="a" fill={STATUS_CFG.unmatched.color}      radius={[0,0,0,0]} />
                        <Bar dataKey="ignored"     name="Ignorado"      stackId="a" fill={STATUS_CFG.ignored.color}        radius={[0,0,0,0]} />
                        <Bar dataKey="notRealized" name="Não realizado" stackId="a" fill={STATUS_CFG['not-realized'].color} radius={[0,0,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-sm text-[var(--bd3)]">Sem dados suficientes</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 4. Overdue ── */}
            {data.overdueNotRealized.length > 0 && (
              <div>
                <SectionHeader label="Recebimentos atrasados" title="Previstos há mais de 30 dias" count={data.overdueNotRealized.length} />
                <div className="bg-[var(--bg3)] border border-[var(--bd)] overflow-hidden">
                  <div className="divide-y divide-[var(--bd)]">
                    {data.overdueNotRealized.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg4)] transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--tx)] truncate">{tx.name}</p>
                          <p className="text-xs text-[var(--tx3)] mt-0.5">Previsto para {fmtDate(tx.paymentDate)}</p>
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color: '#22C55E' }}>{fmtBRL(tx.value)}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 shrink-0 border" style={{ color: '#FBBF24', borderColor: '#FBBF2466' }}>
                          {tx.daysOverdue}d atraso
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 bg-[var(--bg)] border-t border-[var(--bd)] flex justify-between text-xs text-[var(--tx3)] font-medium">
                    <span>{data.overdueNotRealized.length} recebimentos pendentes</span>
                    <span style={{ color: '#22C55E' }}>{fmtBRL(data.overdueNotRealized.reduce((s, t) => s + t.value, 0))}</span>
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
                    <div key={gi} className="bg-[var(--bg3)] border border-[var(--bd)] overflow-hidden">
                      <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--bd)] flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--tx2)]">
                          {group.transactions.length} transações · {group.month} · <span style={{ color: '#22C55E' }}>{fmtBRL(group.value)}</span> cada
                        </p>
                        <span className="text-xs text-[var(--tx3)]">Verifique no Notion</span>
                      </div>
                      <div className="divide-y divide-[var(--bd)]">
                        {group.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center gap-4 px-5 py-2.5">
                            <p className="flex-1 text-sm text-[var(--tx2)] truncate">{tx.name}</p>
                            <span className="text-xs text-[var(--tx3)] shrink-0">{fmtDate(tx.paymentDate)}</span>
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
                <div className="bg-[var(--bg3)] border border-[var(--bd)] overflow-hidden">
                  {(() => {
                    const avg = Math.round(data.impliedRates.reduce((s, r) => s + r.rate, 0) / data.impliedRates.length)
                    return (
                      <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--bd)] flex items-center justify-between text-xs text-[var(--tx3)]">
                        <span>Taxa média: <strong style={{ color: '#60A5FA' }}>R${avg}/h</strong></span>
                        <span>anomalia = fora de 25–250% da média</span>
                      </div>
                    )
                  })()}
                  <div className="divide-y divide-[var(--bd)]">
                    {data.impliedRates.map((r) => {
                      const maxRate = Math.max(...data.impliedRates.map(x => x.rate))
                      const pct = maxRate > 0 ? (r.rate / maxRate) * 100 : 0
                      return (
                        <div key={r.name} className="px-5 py-3 hover:bg-[var(--bg4)] transition-colors">
                          <div className="flex items-center gap-4 mb-1.5">
                            <p className="text-sm font-medium text-[var(--tx)] flex-1 truncate">{r.name}</p>
                            <span className="text-xs font-medium shrink-0" style={{ color: '#94A3B8' }}>{r.hours}h</span>
                            <span className="text-xs font-medium shrink-0" style={{ color: '#22C55E' }}>{fmtBRL(r.revenue)}</span>
                            <span className="text-sm font-bold shrink-0" style={{ color: r.anomaly ? '#FB923C' : '#60A5FA' }}>R${r.rate}/h</span>
                            {r.anomaly && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 shrink-0 border" style={{ color: '#FB923C', borderColor: '#FB923C66' }}>⚠ fora do padrão</span>
                            )}
                          </div>
                          <div className="w-full h-1.5 bg-[var(--bd)] overflow-hidden">
                            <div className="h-full" style={{ width: `${pct}%`, background: '#60A5FA' }} />
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px border border-[var(--bd)]">
                  {data.projectsWithNoRevenue.length > 0 && (
                    <div className="bg-[var(--bg3)] overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-[var(--bd)] flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-[var(--tx)]">Horas sem receita</p>
                          <p className="text-xs text-[var(--tx3)] mt-0.5">Clockify sem transação no Notion</p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--tx2)] border border-[var(--bd2)] px-2 py-0.5">
                          {data.projectsWithNoRevenue.length}
                        </span>
                      </div>
                      <div className="divide-y divide-[var(--bd)]">
                        {(showAllNoRevenue ? data.projectsWithNoRevenue : data.projectsWithNoRevenue.slice(0, 8)).map((p) => (
                          <div key={p.name} className="flex items-center justify-between px-5 py-2.5 hover:bg-[var(--bg4)] transition-colors">
                            <span className="text-sm text-[var(--tx2)] truncate">{p.name}</span>
                            <span className="text-xs font-medium shrink-0 ml-2" style={{ color: '#60A5FA' }}>{p.hours}h</span>
                          </div>
                        ))}
                        {data.projectsWithNoRevenue.length > 8 && (
                          <button onClick={() => setShowAllNoRevenue(v => !v)}
                            className="w-full text-xs text-[var(--tx3)] hover:text-[var(--tx)] py-2.5 text-center transition-colors border-t border-[var(--bd)]">
                            {showAllNoRevenue ? 'Ver menos' : `+${data.projectsWithNoRevenue.length - 8} projetos`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {data.revenueProjectsNoHours.length > 0 && (
                    <div className="bg-[var(--bg3)] overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-[var(--bd)] flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-[var(--tx)]">Receita sem horas</p>
                          <p className="text-xs text-[var(--tx3)] mt-0.5">Notion sem registro no Clockify</p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--tx2)] border border-[var(--bd2)] px-2 py-0.5">
                          {data.revenueProjectsNoHours.length}
                        </span>
                      </div>
                      <div className="divide-y divide-[var(--bd)]">
                        {data.revenueProjectsNoHours.map((p) => (
                          <div key={p.name} className="flex items-center justify-between px-5 py-2.5 hover:bg-[var(--bg4)] transition-colors">
                            <span className="text-sm text-[var(--tx2)] truncate">{p.name}</span>
                            <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: '#22C55E' }}>{fmtBRL(p.revenue)}</span>
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
                    <div key={s.txId} className="bg-[var(--bg3)] border border-[var(--bd)] px-5 py-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--tx)] truncate">{s.txName}</p>
                          <p className="text-xs text-[var(--tx3)] mt-0.5">
                            {fmtDate(s.paymentDate)} · <span style={{ color: '#22C55E' }}>{fmtBRL(s.txValue)}</span> · nome extraído:{' '}
                            <span className="font-mono bg-[var(--bd)] px-1 text-[var(--tx2)]">{s.extractedName}</span>
                          </p>
                        </div>
                        <Badge status="unmatched" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-[var(--tx3)] self-center">Projetos próximos:</span>
                        {s.suggestions.map((sg) => {
                          const score = Math.round(sg.score * 100)
                          return (
                            <span key={sg.project}
                              className="flex items-center gap-1.5 text-xs border px-2.5 py-1 font-medium"
                              style={{ borderColor: '#60A5FA44', color: '#60A5FA' }}>
                              {sg.project}
                              <span style={{ color: '#FB923C' }}>{score}%</span>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {!expandSuggestions && data.suggestions.length > 3 && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none" />
                  )}
                </div>
                {data.suggestions.length > 3 && (
                  <button onClick={() => setExpandSuggestions(v => !v)}
                    className="mt-3 w-full text-xs font-medium text-[var(--tx3)] hover:text-[var(--tx)] py-2 border border-[var(--bd)] bg-[var(--bg3)] transition-colors hover:border-[var(--bd3)]">
                    {expandSuggestions ? 'Ver menos' : `Ver todas as ${data.suggestions.length} sugestões`}
                  </button>
                )}
              </div>
            )}

            {/* ── 9. Transaction table ── */}
            <div>
              <SectionHeader label="Detalhe" title="Todas as transações do período" count={data.periodTransactions.length} />
              <div className="bg-[var(--bg3)] border border-[var(--bd)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--bd)] flex items-center justify-between flex-wrap gap-3">
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'matched', 'unmatched', 'ignored', 'not-realized'] as const).map((s) => {
                      const isAll = s === 'all'
                      const count = isAll ? data.periodTransactions.length : data.periodTransactions.filter((tx) => tx.status === s).length
                      const cfg = isAll ? null : STATUS_CFG[s]
                      return (
                        <button key={s} onClick={() => setFilterStatus(s)}
                          className="px-2.5 py-1 text-xs font-semibold border transition-colors"
                          style={filterStatus === s
                            ? { background: 'var(--inv)', color: 'var(--inv-tx)', borderColor: 'var(--inv)' }
                            : isAll
                              ? { borderColor: 'var(--bd)', color: 'var(--tx2)' }
                              : { borderColor: cfg!.color + '55', color: cfg!.color }
                          }>
                          {isAll ? 'Todas' : cfg!.label} ({count})
                        </button>
                      )
                    })}
                  </div>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bd3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm bg-[var(--bg2)] border border-[var(--bd)] text-[var(--tx)] outline-none focus:border-[var(--bd3)] w-44 placeholder-[var(--bd3)]" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--bd)] bg-[var(--bg)]">
                        {['Data', 'Transação (Notion)', 'Valor', 'Nome extraído', 'Projeto Clockify', 'Status'].map((h, i) => (
                          <th key={h} className={`text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wide px-5 py-3 ${i >= 2 && i < 4 ? 'px-3' : ''} ${i === 2 ? 'text-right' : 'text-left'} ${i === 5 ? 'text-center' : ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--bd)]">
                      {visibleTx.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-[var(--bd3)] py-16 text-sm">Nenhuma transação encontrada</td></tr>
                      )}
                      {visibleTx.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[var(--bg4)] transition-colors">
                          <td className="px-5 py-3 text-[var(--tx3)] whitespace-nowrap text-xs">{fmtDate(tx.paymentDate)}</td>
                          <td className="px-5 py-3 font-medium text-[var(--tx)] max-w-[240px]">
                            <span className="truncate block" title={tx.name}>{tx.name}</span>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold whitespace-nowrap" style={{ color: '#22C55E' }}>{fmtBRL(tx.value)}</td>
                          <td className="px-3 py-3">
                            {tx.extractedName
                              ? <span className="font-mono text-xs bg-[var(--bd)] text-[var(--tx2)] px-1.5 py-0.5">{tx.extractedName}</span>
                              : <span className="text-[var(--bd3)] text-xs">—</span>}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-[var(--tx)]">{tx.matchedProject ?? <span className="font-normal text-[var(--bd3)] text-xs">—</span>}</td>
                          <td className="px-5 py-3 text-center"><Badge status={tx.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {visibleTx.length > 0 && (
                  <div className="px-5 py-3 border-t border-[var(--bd)] flex items-center justify-between text-xs text-[var(--tx3)]">
                    <span>{visibleTx.length} transações</span>
                    <span className="font-semibold" style={{ color: '#22C55E' }}>{fmtBRL(visibleTx.reduce((s, tx) => s + tx.value, 0))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 10. Clockify reference ── */}
            <details className="group">
              <summary className="cursor-pointer flex items-center gap-2 text-[11px] font-semibold text-[var(--tx3)] hover:text-[var(--tx)] transition-colors py-2 select-none list-none uppercase tracking-wider">
                <svg className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Projetos Clockify no período ({data.clockifyProjects.length})
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.clockifyProjects.map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 bg-[var(--bg3)] border border-[var(--bd)] text-[var(--tx2)] hover:border-[var(--bd3)] transition-colors">
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
