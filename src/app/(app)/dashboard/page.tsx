'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardData } from '@/types'
import KPICards from '@/components/KPICards'
import CostByProjectChart from '@/components/CostByProjectChart'
import CostByCollaborator from '@/components/CostByCollaborator'
import PLTable from '@/components/PLTable'
import DateRangePicker from '@/components/DateRangePicker'
import MonthlyChart from '@/components/MonthlyChart'
import AlertsPanel from '@/components/AlertsPanel'
import RateHistoryChart from '@/components/RateHistoryChart'
import DashboardSkeleton from '@/components/DashboardSkeleton'
import PriceSimulator from '@/components/PriceSimulator'
import { ProjectPL, ProjectCostData, MonthlyData } from '@/types'

const AUTO_REFRESH_MS = 60 * 60 * 1000

const DEFAULT_START = '2025-06-01'
const DEFAULT_END = new Date().toISOString().split('T')[0]

function InternalProjectsSection({ pl, costByProject }: { pl: ProjectPL[]; costByProject: ProjectCostData[] }) {
  const [open, setOpen] = useState(false)
  if (pl.length === 0) return null
  const totalCost = pl.reduce((s, p) => s + p.cost, 0)
  const totalHours = pl.reduce((s, p) => s + p.hours, 0)
  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-500">Projetos internos</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
            {pl.length}
          </span>
          <span className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            <span>{Math.round(totalHours)}h registradas</span>
            <span>·</span>
            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalCost)} em custo</span>
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-50">
          <PLTable pl={pl} costByProject={costByProject} />
        </div>
      )}
    </div>
  )
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function StrategicAnalysis({ pl, monthly }: { pl: ProjectPL[]; monthly: MonthlyData[] }) {
  const [open, setOpen] = useState(true)

  // Card A: Revenue Concentration
  const clientPl = pl.filter((p) => !p.isInternal && p.revenue > 0)
  const totalRev = clientPl.reduce((s, p) => s + p.revenue, 0)
  const top5 = [...clientPl].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const top1Pct = top5.length > 0 && totalRev > 0 ? (top5[0].revenue / totalRev) * 100 : 0

  // Card B: Next Month Forecast
  const realizedMonths = monthly.filter((m) => m.revenue > 0)
  const last3 = realizedMonths.slice(-3)
  const avgRevenue3m = last3.length > 0 ? last3.reduce((s, m) => s + m.revenue, 0) / last3.length : 0
  const predictedRevTotal = monthly.reduce((s, m) => s + (m.predictedRevenue ?? 0), 0)
  // Last month in array with a predictedRevenue value
  const nextPredicted = [...monthly].reverse().find((m) => (m.predictedRevenue ?? 0) > 0)

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mb-8 group"
    >
      <summary className="flex items-center justify-between px-6 py-4 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer list-none select-none hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-gray-900">Análise Estratégica</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            IA · contexto
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-3">
        {/* Card A: Revenue Concentration */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Concentração de Receita</h3>
            {top1Pct > 40 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Alta concentração
              </span>
            )}
          </div>

          {clientPl.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum projeto com receita neste período</p>
          ) : (
            <div className="space-y-3">
              {top5.map((p, i) => {
                const pct = totalRev > 0 ? (p.revenue / totalRev) * 100 : 0
                const isTop = i === 0
                return (
                  <div key={p.clockifyProjectId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium truncate max-w-[60%] ${isTop && top1Pct > 40 ? 'text-amber-700' : 'text-gray-800'}`}>
                        {p.clockifyProjectName}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500">{fmtBRL(p.revenue)}</span>
                        <span className={`text-xs font-bold ${isTop && top1Pct > 40 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isTop && top1Pct > 40 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {totalRev > 0 && (
                <p className="text-xs text-gray-400 pt-1">
                  Total: {fmtBRL(totalRev)} · {clientPl.length} projeto{clientPl.length !== 1 ? 's' : ''} com receita
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card B: Next Month Forecast */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Previsão de Receita</h3>

          <div className="space-y-4">
            {/* Historical average */}
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Média histórica (3m)
                </p>
                <p className="text-2xl font-bold text-gray-900">{fmtBRL(avgRevenue3m)}</p>
                {last3.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Baseado em: {last3.map((m) => m.label).join(', ')}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>

            {/* Predicted revenue from Notion */}
            <div className={`flex items-center justify-between py-3 px-4 rounded-xl ${predictedRevTotal > 0 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
              <div>
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">
                  Receita prevista no Notion
                </p>
                <p className={`text-2xl font-bold ${predictedRevTotal > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>
                  {predictedRevTotal > 0 ? fmtBRL(predictedRevTotal) : '—'}
                </p>
                {nextPredicted && (
                  <p className="text-xs text-indigo-400 mt-0.5">
                    Próx. período: {fmtBRL(nextPredicted.predictedRevenue)} ({nextPredicted.label})
                  </p>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${predictedRevTotal > 0 ? 'bg-indigo-100' : 'bg-gray-200'}`}>
                <svg className={`w-5 h-5 ${predictedRevTotal > 0 ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>

            {/* Delta */}
            {avgRevenue3m > 0 && predictedRevTotal > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
                {(() => {
                  const delta = predictedRevTotal - avgRevenue3m
                  const deltaPct = (delta / avgRevenue3m) * 100
                  const positive = delta >= 0
                  return (
                    <span className={`flex items-center gap-1 font-semibold ${positive ? 'text-green-600' : 'text-red-500'}`}>
                      {positive ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}% em relação à média histórica
                    </span>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </details>
  )
}

export default function Dashboard() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('')
  const startRef = useRef(DEFAULT_START)
  const endRef = useRef(DEFAULT_END)

  const fetchData = useCallback(async (s: string, e: string, bust = false) => {
    setLoading(true)
    setError(null)
    try {
      const bustParam = bust ? '&bust=1' : ''
      const res = await fetch(`/api/dashboard?start=${s}&end=${e}${bustParam}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao carregar dados')
      }
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(startRef.current, endRef.current)
    const interval = setInterval(() => {
      fetchData(startRef.current, endRef.current)
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  function handleRangeChange(newStart: string, newEnd: string) {
    setStart(newStart)
    setEnd(newEnd)
    startRef.current = newStart
    endRef.current = newEnd
    fetchData(newStart, newEnd)
  }

  function formatLastUpdated(date: Date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000)
    if (diff < 1) return 'agora mesmo'
    if (diff === 1) return 'há 1 minuto'
    return `há ${diff} minutos`
  }

  // Filter data by selected collaborator
  const filteredData = data && selectedCollaboratorId
    ? {
        ...data,
        pl: data.pl.filter((p) => {
          const costEntry = data.costByProject.find((c) => c.projectId === p.clockifyProjectId)
          return costEntry?.costByCollaborator[selectedCollaboratorId] !== undefined
        }),
        costByProject: data.costByProject.filter(
          (c) => c.costByCollaborator[selectedCollaboratorId] !== undefined
        ),
      }
    : data

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-bold text-gray-900 text-lg">Dashboard</span>
              {lastUpdated && (
                <p className="text-xs text-gray-400 leading-none mt-0.5">
                  Atualizado {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap no-print">
            <DateRangePicker start={start} end={end} onChange={handleRangeChange} />
            <button
              onClick={() => fetchData(start, end, true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40 transition-colors"
              title="Atualizar dados (ignora cache)"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
            <button
              onClick={() => window.print()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40 transition-colors"
              title="Exportar PDF"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {loading && <DashboardSkeleton />}

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

        {!loading && !error && data && filteredData && (
          <>
            {/* KPI Cards */}
            <KPICards data={data} />

            {/* Financial summary banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  CUSTO TOTAL (HORAS)
                </p>
                <p className="text-3xl font-bold text-gray-900 leading-tight mb-1">
                  {fmtBRL(data.totalCostAllCollaborators)}
                </p>
                <p className="text-sm text-gray-500">{data.collaborators.length} pessoas</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  RESULTADO LÍQUIDO
                </p>
                {(() => {
                  const totalRevenue = data.pl.filter((p) => !p.isInternal).reduce((s, p) => s + p.revenue, 0)
                  const net = totalRevenue - data.totalCostAllCollaborators
                  return (
                    <>
                      <p className={`text-3xl font-bold leading-tight mb-1 ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {net >= 0 ? '+' : ''}{fmtBRL(net)}
                      </p>
                      <p className="text-sm text-gray-500">{net >= 0 ? 'superávit' : 'déficit'}</p>
                    </>
                  )
                })()}
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  CUSTO SEM FATURAMENTO
                </p>
                <p className="text-3xl font-bold text-gray-900 leading-tight mb-1">
                  {fmtBRL(data.pl.filter((p) => p.revenue === 0 && !p.isInternal).reduce((s, p) => s + p.cost, 0))}
                </p>
                <p className="text-sm text-gray-500">
                  {data.pl.filter((p) => p.revenue === 0 && !p.isInternal).length} projetos sem receita
                </p>
              </div>
            </div>

            {/* Alerts panel */}
            <AlertsPanel alerts={data.alerts} />

            {/* Análise Estratégica */}
            <StrategicAnalysis pl={data.pl} monthly={data.monthly} />

            {/* Attention banner */}
            {data.pl.some((p) => p.hasAttention) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
                <strong>* atenção</strong> — Projetos marcados têm receita que inclui trabalho feito
                antes de jun/2025 (início do rastreio). O custo real é maior e a margem está inflada.
              </div>
            )}

            {/* Monthly evolution */}
            {data.monthly.length > 0 && <MonthlyChart data={data.monthly} />}

            {/* Collaborator filter bar */}
            <div className="flex items-center gap-3 mb-4 no-print flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Filtrar por colaborador
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCollaboratorId('')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    !selectedCollaboratorId
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  Todos
                </button>
                {data.collaborators.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCollaboratorId(c.id === selectedCollaboratorId ? '' : c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedCollaboratorId === c.id
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                    style={selectedCollaboratorId === c.id ? { background: c.color, borderColor: c.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: selectedCollaboratorId === c.id ? 'white' : c.color }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <CostByProjectChart data={filteredData} />
              </div>
              <div>
                <CostByCollaborator data={data} />
              </div>
            </div>

            {/* Collaborator rate history */}
            {data.monthly.length > 1 && <RateHistoryChart data={data.monthly} />}

            {/* Price Simulator */}
            <PriceSimulator collaborators={data.collaborators} />

            {/* P&L Table — client projects */}
            <PLTable
              pl={filteredData.pl.filter((p) => !p.isInternal)}
              costByProject={filteredData.costByProject}
            />

            {/* P&L Table — internal projects */}
            <InternalProjectsSection
              pl={data.pl.filter((p) => p.isInternal)}
              costByProject={data.costByProject}
            />
          </>
        )}
      </main>
    </div>
  )
}

