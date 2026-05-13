'use client'
import { useState, useEffect, useCallback } from 'react'
import { DashboardData } from '@/types'
import KPICards from '@/components/KPICards'
import CostByProjectChart from '@/components/CostByProjectChart'
import CostByCollaborator from '@/components/CostByCollaborator'
import PLTable from '@/components/PLTable'
import DateRangePicker from '@/components/DateRangePicker'

const DEFAULT_START = '2025-06-01'
const DEFAULT_END = new Date().toISOString().split('T')[0]

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

export default function Dashboard() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (s: string, e: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard?start=${s}&end=${e}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao carregar dados')
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(start, end)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRangeChange(newStart: string, newEnd: string) {
    setStart(newStart)
    setEnd(newEnd)
    fetchData(newStart, newEnd)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gray-900 rounded-md" />
            <span className="font-bold text-gray-900 text-lg">Mainnet Dashboard</span>
          </div>
          <DateRangePicker start={start} end={end} onChange={handleRangeChange} />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Carregando dados do Clockify e Notion…</p>
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

        {/* Content */}
        {!loading && !error && data && (
          <>
            {/* KPI Cards */}
            <KPICards data={data} />

            {/* Revenue + Cost summary banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  RECEITA RASTREADA
                </p>
                <p className="text-3xl font-bold text-gray-900 leading-tight mb-1">
                  {fmtBRL(data.pl.reduce((s, p) => s + p.revenue, 0))}
                </p>
                <p className="text-sm text-gray-500">entradas realizadas no Notion</p>
              </div>
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
                  const totalRevenue = data.pl.reduce((s, p) => s + p.revenue, 0)
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
                  {fmtBRL(data.pl.filter((p) => p.revenue === 0).reduce((s, p) => s + p.cost, 0))}
                </p>
                <p className="text-sm text-gray-500">
                  {data.pl.filter((p) => p.revenue === 0).length} projetos sem receita
                </p>
              </div>
            </div>

            {/* Attention banner */}
            {data.pl.some((p) => p.hasAttention) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
                <strong>* atenção</strong> — Projetos marcados têm receita que inclui trabalho feito
                antes de jun/2025 (início do rastreio). O custo real é maior e a margem está inflada.
              </div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <CostByProjectChart data={data} />
              </div>
              <div>
                <CostByCollaborator data={data} />
              </div>
            </div>

            {/* P&L Table */}
            <PLTable pl={data.pl} />
          </>
        )}
      </main>
    </div>
  )
}
