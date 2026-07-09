'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Label, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { TOOLTIP_CARD } from '@/components/charts/chart-primitives'
import PageHeader from '@/components/shell/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'
import StudioPageActions from '@/components/studio/StudioPageActions'
import StatWidget from '@/components/ds/StatWidget'
import WidgetCard from '@/components/ds/WidgetCard'
import SectionHeader from '@/components/ds/SectionHeader'
import BadgeDS from '@/components/ds/Badge'
import * as Button from '@/components/ui/button'
import { RiDownloadLine } from '@remixicon/react'

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
  matched:        { label: 'Vinculado',     borderClass: 'border-success-light/50',  textClass: 'text-success-base'  },
  unmatched:      { label: 'Sem vínculo',   borderClass: 'border-error-light/50',  textClass: 'text-error-base' },
  ignored:        { label: 'Ignorado',      borderClass: 'border-stroke-soft-200/50',  textClass: 'text-text-soft-400' },
  'not-realized': { label: 'Não realizado', borderClass: 'border-away-light/50',  textClass: 'text-away-base' },
}

const STATUS_CHART_COLORS = {
  matched:        '#1fc16b',
  unmatched:      '#fb3748',
  ignored:        '#a3a3a3',
  'not-realized': '#f6b51e',
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
    <BadgeDS variant={status === 'matched' ? 'success' : status === 'unmatched' ? 'error' : status === 'not-realized' ? 'warning' : 'neutral'}>
      {c.label}
    </BadgeDS>
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
    <div className={`${TOOLTIP_CARD} text-paragraph-sm`}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.payload.color }} />
        <span className="text-text-sub-600">{p.name}</span>
        <span className="ml-2 font-medium text-text-strong-950">{p.value}</span>
      </div>
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className={`${TOOLTIP_CARD} min-w-[140px] text-paragraph-sm`}>
      <p className="mb-2 text-label-xs text-text-soft-400">{label}</p>
      {payload.filter(p => p.value > 0).map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="flex-1 text-paragraph-xs text-text-sub-600">{p.name}</span>
          <span className="font-medium text-text-strong-950">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const DEFAULT_END = new Date().toISOString().split('T')[0]
const DEFAULT_START = (() => {
  const d = new Date(); d.setMonth(d.getMonth() - 6); d.setDate(1)
  return d.toISOString().split('T')[0]
})()
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
  const [openDupGroups, setOpenDupGroups] = useState<Set<number>>(new Set([0]))
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [manualLinks, setManualLinks] = useState<Record<string, string>>({})
  const STATUS_CFG = useStatusCfg()

  // Load manual links from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auditoria-manual-links')
      if (saved) setManualLinks(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  function handleManualLink(txId: string, projectName: string) {
    setManualLinks(prev => {
      const next = { ...prev, [txId]: projectName }
      try { localStorage.setItem('auditoria-manual-links', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  function handleRemoveLink(txId: string) {
    setManualLinks(prev => {
      const next = { ...prev }
      delete next[txId]
      try { localStorage.setItem('auditoria-manual-links', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const fetchData = useCallback(async (s: string, e: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/auditoria?start=${s}&end=${e}`)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'Erro') }
      setData(await res.json())
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(DEFAULT_START, DEFAULT_END) }, []) // eslint-disable-line

  // Apply manual links on top of API data
  const effectivePeriodTx = (data?.periodTransactions ?? []).map(tx => {
    const override = manualLinks[tx.id]
    if (!override) return tx
    return { ...tx, status: 'matched' as TxStatus, matchedProject: override }
  })

  // Recompute summary from effective transactions (reflects manual links)
  const effectiveSummary = {
    totalRealizedRevenue: effectivePeriodTx.filter(tx => tx.realized).reduce((s, tx) => s + tx.value, 0),
    totalMatchedRevenue:  effectivePeriodTx.filter(tx => tx.status === 'matched').reduce((s, tx) => s + tx.value, 0),
    totalIgnoredRevenue:  effectivePeriodTx.filter(tx => tx.status === 'ignored').reduce((s, tx) => s + tx.value, 0),
    totalUnmatchedRevenue: effectivePeriodTx.filter(tx => tx.status === 'unmatched').reduce((s, tx) => s + tx.value, 0),
    matchedCount:     effectivePeriodTx.filter(tx => tx.status === 'matched').length,
    unmatchedCount:   effectivePeriodTx.filter(tx => tx.status === 'unmatched').length,
    ignoredCount:     effectivePeriodTx.filter(tx => tx.status === 'ignored').length,
    notRealizedCount: effectivePeriodTx.filter(tx => tx.status === 'not-realized').length,
  }

  const matchPct = effectiveSummary.matchedCount + effectiveSummary.unmatchedCount > 0
    ? Math.round(effectiveSummary.matchedCount / (effectiveSummary.matchedCount + effectiveSummary.unmatchedCount) * 100)
    : null

  // Recompute monthly breakdown from effective transactions
  const effectiveMonthlyBreakdown = (() => {
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const map: Record<string, { matched: number; unmatched: number; ignored: number; notRealized: number; matchedValue: number; unmatchedValue: number }> = {}
    for (const tx of effectivePeriodTx) {
      if (!tx.paymentDate) continue
      const ym = tx.paymentDate.slice(0, 7)
      if (!map[ym]) map[ym] = { matched: 0, unmatched: 0, ignored: 0, notRealized: 0, matchedValue: 0, unmatchedValue: 0 }
      const key = tx.status === 'not-realized' ? 'notRealized' : tx.status as 'matched' | 'unmatched' | 'ignored'
      map[ym][key]++
      if (tx.status === 'matched')   map[ym].matchedValue += tx.value
      if (tx.status === 'unmatched') map[ym].unmatchedValue += tx.value
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([ym, c]) => {
      const [y, m] = ym.split('-')
      return { ym, label: `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`, ...c, total: c.matched + c.unmatched + c.ignored + c.notRealized }
    })
  })()

  const visibleTx = effectivePeriodTx.filter((tx) => {
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return tx.name.toLowerCase().includes(q) || (tx.extractedName ?? '').toLowerCase().includes(q) || (tx.matchedProject ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const actions: string[] = []
  if (data) {
    if (effectiveSummary.unmatchedCount > 0)
      actions.push(`${effectiveSummary.unmatchedCount} transaç${effectiveSummary.unmatchedCount > 1 ? 'ões' : 'ão'} sem vínculo (${fmtBRL(effectiveSummary.totalUnmatchedRevenue)})`)
    if (data.duplicateGroups.length > 0)
      actions.push(`${data.duplicateGroups.length} grupo${data.duplicateGroups.length > 1 ? 's' : ''} de possíveis duplicatas`)
    if (data.overdueNotRealized.length > 0)
      actions.push(`${data.overdueNotRealized.length} recebimento${data.overdueNotRealized.length > 1 ? 's' : ''} previst${data.overdueNotRealized.length > 1 ? 'os' : 'o'} há mais de 30 dias`)
    if (data.impliedRates.filter(r => r.anomaly).length > 0)
      actions.push(`${data.impliedRates.filter(r => r.anomaly).length} projeto${data.impliedRates.filter(r => r.anomaly).length > 1 ? 's' : ''} com taxa/h fora do padrão`)
  }

  return (
    <>
      <PageHeader
        title="Auditoria"
        subtitle={lastUpdated ? `Atualizado ${(() => {
          const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
          if (diff < 1) return 'agora mesmo'
          if (diff === 1) return 'há 1 minuto'
          return `há ${diff} minutos`
        })()}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e) }} />
            <Button.Root variant="primary" mode="filled" size="small" onClick={() => fetchData(start, end)} disabled={loading}>
              {loading ? 'Carregando…' : 'Aplicar'}
            </Button.Root>
            <StudioPageActions loading={loading} onRefresh={() => fetchData(start, end)} />
            {data && (
              <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => exportCSV(data.periodTransactions)}>
                <Button.Icon as={RiDownloadLine} />
                CSV
              </Button.Root>
            )}
          </div>
        }
      />

      <main className="flex flex-col gap-6 p-5">

        {loading && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="mn-shimmer h-36 rounded-2xl" />)}
            </div>
            <div className="mn-shimmer h-64 rounded-2xl" />
            <div className="mn-shimmer h-96 rounded-2xl" />
          </div>
        )}

        {!loading && error && (
          <WidgetCard className="text-center">
            <p className="text-label-md text-text-strong-950">Erro ao carregar dados</p>
            <p className="mt-1 text-paragraph-sm text-text-sub-600">{error}</p>
            <Button.Root variant="primary" mode="filled" size="small" className="mt-4" onClick={() => fetchData(start, end)}>
              Tentar novamente
            </Button.Root>
          </WidgetCard>
        )}

        {!loading && !error && data && (
          <div className="flex flex-col gap-6 mn-page-stagger">

            {/* ── 1. Action summary ── */}
            {actions.length > 0 && (
              <WidgetCard className="border-away-light/40 bg-away-lighter/30">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0" style={{ background: '#f6b51e22' }}>
                    <svg className="w-3.5 h-3.5" style={{ color: '#f6b51e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <p className="text-label-sm" style={{ color: '#f6b51e' }}>
                    {actions.length} {actions.length === 1 ? 'ponto requer atenção' : 'pontos requerem atenção'}
                  </p>
                </div>
                <ul className="space-y-1.5 ml-8">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-label-sm">
                      <span className="mt-0.5 shrink-0" style={{ color: '#f6b51e' }}>·</span>{a}
                    </li>
                  ))}
                </ul>
              </WidgetCard>
            )}

            <div>
              <SectionHeader title="Resumo do período" description="Visão geral" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatWidget label="Receita realizada" value={<span className="text-success-base">{fmtBRL(effectiveSummary.totalRealizedRevenue)}</span>} delta="período selecionado" />
                <StatWidget label="Receita vinculada" value={<span className="text-success-base">{fmtBRL(effectiveSummary.totalMatchedRevenue)}</span>} delta={`${effectiveSummary.matchedCount} transações${matchPct !== null ? ` · ${matchPct}%` : ''}`} />
                <StatWidget label="Sem vínculo" value={<span className="text-error-base">{fmtBRL(effectiveSummary.totalUnmatchedRevenue)}</span>} delta={`${effectiveSummary.unmatchedCount} transações`} deltaVariant="error" />
                <StatWidget label="Ignoradas / Previstas" value={effectiveSummary.ignoredCount + effectiveSummary.notRealizedCount} delta={`${effectiveSummary.ignoredCount} ignoradas · ${effectiveSummary.notRealizedCount} previstas`} deltaVariant="neutral" />
              </div>

              {matchPct !== null && (
                <WidgetCard className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-label-sm">Cobertura de vínculo</p>
                    <p className="text-title-h5" style={{ color: matchPct >= 70 ? '#1fc16b' : matchPct >= 40 ? '#f6b51e' : '#fb3748' }}>{matchPct}%</p>
                  </div>
                  {(() => {
                    const total = effectiveSummary.matchedCount + effectiveSummary.unmatchedCount + effectiveSummary.ignoredCount
                    const mPct = total > 0 ? (effectiveSummary.matchedCount / total) * 100 : 0
                    const iPct = total > 0 ? (effectiveSummary.ignoredCount / total) * 100 : 0
                    const uPct = total > 0 ? (effectiveSummary.unmatchedCount / total) * 100 : 0
                    return (
                      <>
                        <div className="w-full flex gap-0.5 mb-3" style={{ height: 10 }}>
                          <div className="transition-all duration-700" style={{ width: `${mPct}%`, background: '#1fc16b', borderRadius: 4 }} title={`Vinculadas: ${effectiveSummary.matchedCount}`} />
                          <div className="transition-all duration-700" style={{ width: `${iPct}%`, background: '#a3a3a3', borderRadius: 4 }} title={`Ignoradas: ${effectiveSummary.ignoredCount}`} />
                          <div className="transition-all duration-700" style={{ width: `${uPct}%`, background: '#fb3748', borderRadius: 4 }} title={`Sem vínculo: ${effectiveSummary.unmatchedCount}`} />
                        </div>
                        <div className="flex gap-5 text-paragraph-xs">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#1fc16b' }} /><span style={{ color: '#1fc16b' }} className="font-semibold">{effectiveSummary.matchedCount}</span><span >vinculadas</span></span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#a3a3a3' }} /><span >{effectiveSummary.ignoredCount}</span><span >ignoradas</span></span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#fb3748' }} /><span style={{ color: '#fb3748' }} className="font-semibold">{effectiveSummary.unmatchedCount}</span><span >sem vínculo</span></span>
                        </div>
                      </>
                    )
                  })()}
                </WidgetCard>
              )}
            </div>

            <div>
              <SectionHeader title="Distribuição e tendência mensal" description="Análise visual" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <WidgetCard>
                  <p className="text-label-sm mb-0.5">Status das transações</p>
                  <p className="text-paragraph-xs mb-5">Distribuição por tipo no período</p>
                  {(() => {
                    const pieData = [
                      { name: 'Vinculado',     value: effectiveSummary.matchedCount,     color: STATUS_CFG.matched.color },
                      { name: 'Sem vínculo',   value: effectiveSummary.unmatchedCount,   color: STATUS_CFG.unmatched.color },
                      { name: 'Ignorado',      value: effectiveSummary.ignoredCount,     color: STATUS_CFG.ignored.color },
                      { name: 'Não realizado', value: effectiveSummary.notRealizedCount, color: STATUS_CFG['not-realized'].color },
                    ].filter(d => d.value > 0)
                    const totalTx = pieData.reduce((s, d) => s + d.value, 0)
                    return (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%" cy="50%"
                              innerRadius={62} outerRadius={88}
                              paddingAngle={2}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {pieData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                              ))}
                              <Label
                                content={({ viewBox }) => {
                                  const vb = viewBox as { cx: number; cy: number }
                                  return (
                                    <g>
                                      <text x={vb.cx} y={vb.cy - 8} textAnchor="middle" fill="var(--color-text-strong-950)" fontSize={26} fontWeight={700}>{totalTx}</text>
                                      <text x={vb.cx} y={vb.cy + 12} textAnchor="middle" fill="var(--color-text-soft-400)" fontSize={10} letterSpacing={1}>TRANSAÇÕES</text>
                                    </g>
                                  )
                                }}
                              />
                            </Pie>
                            <RTooltip content={<PieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Custom legend */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-4">
                          {pieData.map(item => (
                            <div key={item.name} className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                              <span className="text-paragraph-xs flex-1 truncate">{item.name}</span>
                              <span className="text-label-xs tabular-nums ml-auto" style={{ color: item.color }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </WidgetCard>

                <WidgetCard>
                  <p className="text-label-sm mb-0.5">Transações por mês</p>
                  <p className="text-paragraph-xs mb-5">Vinculadas vs sem vínculo ao longo do tempo</p>
                  {effectiveMonthlyBreakdown.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={effectiveMonthlyBreakdown} margin={{ top: 2, right: 0, left: -28, bottom: 0 }} barCategoryGap="25%">
                          <CartesianGrid strokeDasharray="2 4" stroke="var(--color-stroke-soft-200)" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-soft-400)' }} axisLine={false} tickLine={false} tickMargin={8} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-soft-400)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <RTooltip content={<BarTooltip />} cursor={{ fill: 'var(--color-bg-weak-50)', radius: 2 }} />
                          <Bar dataKey="matched"     name="Vinculado"     stackId="a" fill={STATUS_CFG.matched.color}         radius={[0,0,0,0]} />
                          <Bar dataKey="unmatched"   name="Sem vínculo"   stackId="a" fill={STATUS_CFG.unmatched.color}       radius={[0,0,0,0]} />
                          <Bar dataKey="ignored"     name="Ignorado"      stackId="a" fill={STATUS_CFG.ignored.color}         radius={[0,0,0,0]} />
                          <Bar dataKey="notRealized" name="Não realizado" stackId="a" fill={STATUS_CFG['not-realized'].color} radius={[3,3,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      {/* Legend chips */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        {[
                          { label: 'Vinculado',     color: STATUS_CFG.matched.color },
                          { label: 'Sem vínculo',   color: STATUS_CFG.unmatched.color },
                          { label: 'Ignorado',      color: STATUS_CFG.ignored.color },
                          { label: 'Não realizado', color: STATUS_CFG['not-realized'].color },
                        ].map(item => (
                          <span key={item.label} className="flex items-center gap-1.5 text-paragraph-xs">
                            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: item.color }} />
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-paragraph-sm text-text-soft-400">Sem dados suficientes</div>
                  )}
                </WidgetCard>
              </div>
            </div>

            {/* ── 4. Overdue ── */}
            {data.overdueNotRealized.length > 0 && (
              <div>
                <SectionHeader
                  title="Previstos há mais de 30 dias"
                  description="Recebimentos atrasados"
                  actions={<BadgeDS variant="info">{data.overdueNotRealized.length}</BadgeDS>}
                />
                <WidgetCard>
                  <div className="flex flex-col gap-1">
                    {data.overdueNotRealized.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-bg-weak-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-label-sm truncate">{tx.name}</p>
                          <p className="text-paragraph-xs mt-0.5">Previsto para {fmtDate(tx.paymentDate)}</p>
                        </div>
                        <span className="text-label-sm shrink-0" style={{ color: '#1fc16b' }}>{fmtBRL(tx.value)}</span>
                        <span className="text-label-xs px-2 py-0.5 shrink-0 border" style={{ color: '#f6b51e', borderColor: '#f6b51e66' }}>
                          {tx.daysOverdue}d atraso
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between rounded-xl bg-bg-weak-50 px-4 py-3 text-label-xs">
                    <span className="text-text-sub-600">{data.overdueNotRealized.length} recebimentos pendentes</span>
                    <span className="text-success-base">{fmtBRL(data.overdueNotRealized.reduce((s, t) => s + t.value, 0))}</span>
                  </div>
                </WidgetCard>
              </div>
            )}

            {/* ── 5. Duplicates ── */}
            {data.duplicateGroups.length > 0 && (
              <div>
                <SectionHeader
                  title="Mesmo valor e nome no mesmo mês"
                  description="Possíveis duplicatas"
                  actions={<BadgeDS variant="info">{data.duplicateGroups.length}</BadgeDS>}
                />
                <div className="space-y-3">
                  {data.duplicateGroups.map((group, gi) => {
                    const isOpen = openDupGroups.has(gi)
                    return (
                      <WidgetCard key={gi} padding="none" className="overflow-hidden">
                        <button
                          onClick={() => setOpenDupGroups((prev) => {
                            const next = new Set(prev)
                            if (next.has(gi)) next.delete(gi); else next.add(gi)
                            return next
                          })}
                          className="flex w-full items-center justify-between rounded-2xl bg-bg-weak-50 px-5 py-3 text-left transition-colors hover:bg-bg-soft-200"
                        >
                          <p className="text-label-xs">
                            {group.transactions.length} transações · {group.month} · <span style={{ color: '#1fc16b' }}>{fmtBRL(group.value)}</span> cada
                          </p>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-paragraph-xs">Verifique no Notion</span>
                            <svg className={`w-3.5 h-3.5 text-text-soft-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="flex flex-col gap-1 border-t border-stroke-soft-200 p-3">
                            {group.transactions.map((tx) => (
                              <div key={tx.id} className="flex items-center gap-4 rounded-xl bg-bg-weak-50 px-4 py-2.5">
                                <p className="flex-1 text-paragraph-sm truncate">{tx.name}</p>
                                <span className="text-paragraph-xs shrink-0">{fmtDate(tx.paymentDate)}</span>
                                <Badge status={tx.status as TxStatus} />
                              </div>
                            ))}
                          </div>
                        )}
                      </WidgetCard>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── 6. Implied rates ── */}
            {data.impliedRates.length > 0 && (
              <div>
                <SectionHeader
                  title="Receita ÷ horas por projeto"
                  description="Taxa implícita"
                  actions={<BadgeDS variant="info">{data.impliedRates.length}</BadgeDS>}
                />
                <WidgetCard>
                  {(() => {
                    const avg = Math.round(data.impliedRates.reduce((s, r) => s + r.rate, 0) / data.impliedRates.length)
                    return (
                      <div className="mb-3 flex items-center justify-between rounded-xl bg-bg-weak-50 px-4 py-3 text-paragraph-xs text-text-sub-600">
                        <span>Taxa média: <strong className="text-information-base">R${avg}/h</strong></span>
                        <span>anomalia = fora de 25–250% da média</span>
                      </div>
                    )
                  })()}
                  <div className="flex flex-col gap-2">
                    {data.impliedRates.map((r) => {
                      const maxRate = Math.max(...data.impliedRates.map(x => x.rate))
                      const pct = maxRate > 0 ? (r.rate / maxRate) * 100 : 0
                      return (
                        <div key={r.name} className="rounded-xl border border-stroke-soft-200 px-4 py-3 transition-colors hover:bg-bg-weak-50">
                          <div className="flex items-center gap-4 mb-1.5">
                            <p className="text-label-sm flex-1 truncate">{r.name}</p>
                            <span className="text-label-xs shrink-0" style={{ color: '#a3a3a3' }}>{r.hours}h</span>
                            <span className="text-label-xs shrink-0" style={{ color: '#1fc16b' }}>{fmtBRL(r.revenue)}</span>
                            <span className="text-label-sm shrink-0" style={{ color: r.anomaly ? '#fa7319' : '#335cff' }}>R${r.rate}/h</span>
                            {r.anomaly && (
                              <span className="text-label-xs px-1.5 py-0.5 shrink-0 border" style={{ color: '#fa7319', borderColor: '#fa731966' }}>⚠ fora do padrão</span>
                            )}
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stroke-soft-200">
                            <div className="h-full rounded-full bg-information-base" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </WidgetCard>
              </div>
            )}

            {/* ── 7. Project problems ── */}
            {(data.projectsWithNoRevenue.length > 0 || data.revenueProjectsNoHours.length > 0) && (
              <div>
                <SectionHeader title="Horas sem receita · Receita sem horas" description="Inconsistências de projeto" />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {data.projectsWithNoRevenue.length > 0 && (
                    <WidgetCard>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-label-sm text-text-strong-950">Horas sem receita</p>
                          <p className="mt-0.5 text-paragraph-xs text-text-sub-600">Clockify sem transação no Notion</p>
                        </div>
                        <BadgeDS variant="neutral">{data.projectsWithNoRevenue.length}</BadgeDS>
                      </div>
                      <div className="flex flex-col gap-1">
                        {(showAllNoRevenue ? data.projectsWithNoRevenue : data.projectsWithNoRevenue.slice(0, 8)).map((p) => (
                          <div key={p.name} className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-weak-50">
                            <span className="truncate text-label-sm text-text-strong-950">{p.name}</span>
                            <span className="ml-2 shrink-0 text-label-xs text-information-base">{p.hours}h</span>
                          </div>
                        ))}
                        {data.projectsWithNoRevenue.length > 8 && (
                          <button onClick={() => setShowAllNoRevenue(v => !v)}
                            className="mt-1 w-full rounded-lg py-2 text-center text-xs text-text-soft-400 transition-colors hover:text-text-strong-950">
                            {showAllNoRevenue ? 'Ver menos' : `+${data.projectsWithNoRevenue.length - 8} projetos`}
                          </button>
                        )}
                      </div>
                    </WidgetCard>
                  )}
                  {data.revenueProjectsNoHours.length > 0 && (
                    <WidgetCard>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-label-sm text-text-strong-950">Receita sem horas</p>
                          <p className="mt-0.5 text-paragraph-xs text-text-sub-600">Notion sem registro no Clockify</p>
                        </div>
                        <BadgeDS variant="neutral">{data.revenueProjectsNoHours.length}</BadgeDS>
                      </div>
                      <div className="flex flex-col gap-1">
                        {data.revenueProjectsNoHours.map((p) => (
                          <div key={p.name} className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-weak-50">
                            <span className="truncate text-paragraph-sm text-text-strong-950">{p.name}</span>
                            <span className="ml-2 shrink-0 text-label-xs text-success-base">{fmtBRL(p.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </WidgetCard>
                  )}
                </div>
              </div>
            )}

            {/* ── 8. Match suggestions ── */}
            {(() => {
              const pendingSuggestions = data.suggestions.filter(s => !manualLinks[s.txId])
              if (pendingSuggestions.length === 0) return null
              return (
                <div>
                  <SectionHeader
                    title="Projetos parecidos — clique para confirmar"
                    description="Sugestões de vínculo"
                    actions={<BadgeDS variant="info">{pendingSuggestions.length}</BadgeDS>}
                  />
                  <div className={`space-y-2 ${!expandSuggestions ? 'max-h-96 overflow-hidden relative' : ''}`}>
                    {pendingSuggestions.map((s) => (
                      <WidgetCard key={s.txId}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="min-w-0">
                            <p className="text-label-sm truncate">{s.txName}</p>
                            <p className="text-paragraph-xs mt-0.5">
                              {fmtDate(s.paymentDate)} · <span style={{ color: '#1fc16b' }}>{fmtBRL(s.txValue)}</span>
                              {s.extractedName && <> · <span className="bg-stroke-soft-200 px-1">{s.extractedName}</span></>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge status="unmatched" />
                            <select
                              value=""
                              onChange={(e) => { if (e.target.value) handleManualLink(s.txId, e.target.value) }}
                              className="text-paragraph-xs border border-stroke-soft-200 bg-bg-white-0 px-2 py-1 outline-none focus:border-information-light cursor-pointer"
                            >
                              <option value="">Outro projeto…</option>
                              {data.clockifyProjects.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-paragraph-xs self-center">Clique para vincular:</span>
                          {s.suggestions.map((sg) => {
                            const score = Math.round(sg.score * 100)
                            return (
                              <button
                                key={sg.project}
                                onClick={() => handleManualLink(s.txId, sg.project)}
                                className="flex items-center gap-1.5 rounded-lg border border-information-light/40 px-2.5 py-1 text-xs font-medium text-information-base transition-all hover:bg-information-lighter active:scale-95"
                                title={`Vincular a "${sg.project}"`}
                              >
                                {sg.project}
                                <span style={{ color: '#fa7319' }}>{score}%</span>
                                <span className="opacity-50 text-paragraph-xs">✓</span>
                              </button>
                            )
                          })}
                        </div>
                      </WidgetCard>
                    ))}
                    {!expandSuggestions && pendingSuggestions.length > 3 && (
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-bg-weak-50)] to-transparent pointer-events-none" />
                    )}
                  </div>
                  {pendingSuggestions.length > 3 && (
                    <button onClick={() => setExpandSuggestions(v => !v)}
                      className="mt-3 w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 py-2 text-xs font-medium text-text-soft-400 transition-colors hover:border-stroke-sub-300 hover:text-text-strong-950">
                      {expandSuggestions ? 'Ver menos' : `Ver todas as ${pendingSuggestions.length} sugestões`}
                    </button>
                  )}
                </div>
              )
            })()}

            {/* ── 9. Transaction table ── */}
            <div>
              <SectionHeader
                title="Todas as transações do período"
                description="Detalhe"
                actions={<BadgeDS variant="neutral">{data.periodTransactions.length}</BadgeDS>}
              />
              <div className="bg-bg-white-0 border border-stroke-soft-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-stroke-soft-200 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'matched', 'unmatched', 'ignored', 'not-realized'] as const).map((s) => {
                      const isAll = s === 'all'
                      const count = isAll ? effectivePeriodTx.length : effectivePeriodTx.filter((tx) => tx.status === s).length
                      const cfg = isAll ? null : STATUS_CFG[s]
                      return (
                        <button key={s} onClick={() => setFilterStatus(s)}
                          className="px-2.5 py-1 text-label-xs border transition-colors"
                          style={filterStatus === s
                            ? { background: 'var(--color-bg-strong-950)', color: 'var(--color-text-white-0)', borderColor: 'var(--color-bg-strong-950)' }
                            : isAll
                              ? { borderColor: 'var(--color-stroke-soft-200)', color: 'var(--color-text-sub-600)' }
                              : { borderColor: cfg!.color + '55', color: cfg!.color }
                          }>
                          {isAll ? 'Todas' : cfg!.label} ({count})
                        </button>
                      )
                    })}
                  </div>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-soft-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-paragraph-sm bg-bg-soft-200 border border-stroke-soft-200 outline-none focus:border-stroke-sub-300 w-44 placeholder-[var(--color-stroke-sub-300)]" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-paragraph-sm">
                    <thead>
                      <tr className="border-b border-stroke-soft-200 bg-bg-weak-50">
                        {['Data', 'Transação (Notion)', 'Valor', 'Nome extraído', 'Projeto Clockify', 'Status'].map((h, i) => (
                          <th key={h} className={`text-label-2xs px-5 py-3 ${i >= 2 && i < 4 ? 'px-3' : ''} ${i === 2 ? 'text-right' : 'text-left'} ${i === 5 ? 'text-center' : ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-stroke-soft-200)]">
                      {visibleTx.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-text-soft-400 py-16 text-paragraph-sm">Nenhuma transação encontrada</td></tr>
                      )}
                      {visibleTx.map((tx) => (
                        <tr key={tx.id} className="hover:bg-bg-weak-50 transition-colors">
                          <td className="px-5 py-3 whitespace-nowrap text-paragraph-xs">{fmtDate(tx.paymentDate)}</td>
                          <td className="px-5 py-3 max-w-[240px]">
                            <span className="truncate block" title={tx.name}>{tx.name}</span>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap" style={{ color: '#1fc16b' }}>{fmtBRL(tx.value)}</td>
                          <td className="px-3 py-3">
                            {tx.extractedName
                              ? <span className="text-paragraph-xs bg-stroke-soft-200 px-1.5 py-0.5">{tx.extractedName}</span>
                              : <span className="text-text-soft-400 text-paragraph-xs">—</span>}
                          </td>
                          <td className="px-3 py-3 text-paragraph-sm">
                            {manualLinks[tx.id] ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span >{manualLinks[tx.id]}</span>
                                <span className="text-label-2xs px-1 py-px border" style={{ color: '#335cff', borderColor: '#335cff44' }}>manual</span>
                                <button onClick={() => handleRemoveLink(tx.id)} title="Remover vínculo" className="text-text-soft-400 hover:text-error-base text-sm leading-none transition-colors">×</button>
                              </div>
                            ) : tx.matchedProject ? (
                              <span >{tx.matchedProject}</span>
                            ) : tx.status === 'unmatched' ? (
                              <select
                                value=""
                                onChange={(e) => { if (e.target.value) handleManualLink(tx.id, e.target.value) }}
                                className="text-paragraph-xs border border-stroke-soft-200 bg-bg-white-0 px-2 py-1 outline-none focus:border-information-light cursor-pointer max-w-[180px]"
                              >
                                <option value="">Vincular projeto…</option>
                                {data.clockifyProjects.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            ) : (
                              <span className="text-text-soft-400 text-paragraph-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center"><Badge status={tx.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {visibleTx.length > 0 && (
                  <div className="px-5 py-3 border-t border-stroke-soft-200 flex items-center justify-between text-paragraph-xs">
                    <span>{visibleTx.length} transações</span>
                    <span className="font-semibold" style={{ color: '#1fc16b' }}>{fmtBRL(visibleTx.reduce((s, tx) => s + tx.value, 0))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 10. Clockify reference ── */}
            <details className="group">
              <summary className="cursor-pointer flex items-center gap-2 text-[11px] font-semibold text-text-soft-400 hover:text-text-strong-950 transition-colors py-2 select-none list-none uppercase tracking-wider">
                <svg className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Projetos Clockify no período ({data.clockifyProjects.length})
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.clockifyProjects.map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 bg-bg-white-0 border border-stroke-soft-200 text-text-sub-600 hover:border-stroke-sub-300 transition-colors">
                    {p}
                  </span>
                ))}
              </div>
            </details>

          </div>
        )}
      </main>
    </>
  )
}
