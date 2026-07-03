'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { RiArrowRightSLine } from '@remixicon/react'
import { DashboardData, ProjectPL, ProjectCostData, MonthlyData } from '@/types'
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
import OperationalCosts from '@/components/OperationalCosts'
import PageHeader from '@/components/shell/PageHeader'
import StudioPageActions from '@/components/studio/StudioPageActions'
import StatWidget from '@/components/ds/StatWidget'
import WidgetCard from '@/components/ds/WidgetCard'
import SectionHeader from '@/components/ds/SectionHeader'
import Badge from '@/components/ds/Badge'
import * as Button from '@/components/ui/button'
import { cn } from '@/utils/cn'

const AUTO_REFRESH_MS = 60 * 60 * 1000
const DEFAULT_END = new Date().toISOString().split('T')[0]
const DEFAULT_START = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  d.setDate(1)
  return d.toISOString().split('T')[0]
})()

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function InternalProjectsSection({ pl, costByProject }: { pl: ProjectPL[]; costByProject: ProjectCostData[] }) {
  const [open, setOpen] = useState(false)
  if (pl.length === 0) return null
  const totalCost = pl.reduce((s, p) => s + p.cost, 0)
  const totalHours = pl.reduce((s, p) => s + p.hours, 0)

  return (
    <WidgetCard padding="none" className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-bg-weak-50"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-label-md text-text-strong-950">Projetos internos</h2>
          <Badge variant="neutral">{pl.length}</Badge>
          <span className="hidden items-center gap-3 text-paragraph-xs text-text-sub-600 sm:flex">
            <span className="text-away-base">{Math.round(totalHours)}h registradas</span>
            <span>·</span>
            <span className="text-error-base">{fmtBRL(totalCost)} em custo</span>
          </span>
        </div>
        <RiArrowRightSLine className={cn('size-5 text-text-soft-400 transition-transform', open && 'rotate-90')} />
      </button>
      {open && <PLTable pl={pl} costByProject={costByProject} embedded />}
    </WidgetCard>
  )
}

function StrategicAnalysis({ pl, monthly }: { pl: ProjectPL[]; monthly: MonthlyData[] }) {
  const [open, setOpen] = useState(true)

  const clientPl = pl.filter((p) => !p.isInternal && p.revenue > 0)
  const totalRev = clientPl.reduce((s, p) => s + p.revenue, 0)
  const top5 = [...clientPl].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const top1Pct = top5.length > 0 && totalRev > 0 ? (top5[0].revenue / totalRev) * 100 : 0

  const realizedMonths = monthly.filter((m) => m.revenue > 0)
  const last3 = realizedMonths.slice(-3)
  const avgRevenue3m = last3.length > 0 ? last3.reduce((s, m) => s + m.revenue, 0) / last3.length : 0
  const predictedRevTotal = monthly.reduce((s, m) => s + (m.predictedRevenue ?? 0), 0)
  const nextPredicted = [...monthly].reverse().find((m) => (m.predictedRevenue ?? 0) > 0)

  return (
    <WidgetCard padding="none" className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-bg-weak-50"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-label-md text-text-strong-950">Análise estratégica</h2>
          <Badge variant="info">IA · contexto</Badge>
        </div>
        <RiArrowRightSLine className={cn('size-5 text-text-soft-400 transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-stroke-soft-200 p-5 lg:grid-cols-2">
          <div className="rounded-xl border border-stroke-soft-200 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-label-sm text-text-strong-950">Concentração de receita</h3>
              {top1Pct > 40 && <Badge variant="warning">Alta concentração</Badge>}
            </div>

            {clientPl.length === 0 ? (
              <p className="py-4 text-center text-paragraph-sm text-text-sub-600">Nenhum projeto com receita neste período</p>
            ) : (
              <div className="space-y-3">
                {top5.map((p) => {
                  const pct = totalRev > 0 ? (p.revenue / totalRev) * 100 : 0
                  return (
                    <div key={p.clockifyProjectId}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className={cn('max-w-[60%] truncate text-label-sm', pct > 50 ? 'text-away-base' : 'text-success-base')}>
                          {p.clockifyProjectName}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-paragraph-xs text-success-base">{fmtBRL(p.revenue)}</span>
                          <span className={cn('text-label-xs', pct > 50 ? 'text-away-base' : 'text-success-base')}>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-stroke-soft-200">
                        <div
                          className={cn('h-full transition-all', pct > 50 ? 'bg-away-base' : 'bg-success-base')}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {totalRev > 0 && (
                  <p className="pt-1 text-paragraph-xs text-text-sub-600">
                    Total: <span className="text-success-base">{fmtBRL(totalRev)}</span> · {clientPl.length} projeto{clientPl.length !== 1 ? 's' : ''} com receita
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-stroke-soft-200 p-5">
            <h3 className="mb-4 text-label-sm text-text-strong-950">Previsão de receita</h3>
            <div className="space-y-3">
              <div className="rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3">
                <p className="text-label-2xs text-text-sub-600">Média histórica (3m)</p>
                <p className="mt-1 text-title-h5 text-success-base">{fmtBRL(avgRevenue3m)}</p>
                {last3.length > 0 && (
                  <p className="mt-0.5 text-paragraph-xs text-text-sub-600">Baseado em: {last3.map((m) => m.label).join(', ')}</p>
                )}
              </div>
              <div className="rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3">
                <p className="text-label-2xs text-text-sub-600">Receita prevista no Notion</p>
                <p className={cn('mt-1 text-title-h5', predictedRevTotal > 0 ? 'text-success-base' : 'text-text-soft-400')}>
                  {predictedRevTotal > 0 ? fmtBRL(predictedRevTotal) : '—'}
                </p>
                {nextPredicted && (
                  <p className="mt-0.5 text-paragraph-xs text-text-sub-600">
                    Próx. período: <span className="text-success-base">{fmtBRL(nextPredicted.predictedRevenue)}</span> ({nextPredicted.label})
                  </p>
                )}
              </div>
              {avgRevenue3m > 0 && predictedRevTotal > 0 && (
                <p className="text-paragraph-xs">
                  {(() => {
                    const delta = predictedRevTotal - avgRevenue3m
                    const deltaPct = (delta / avgRevenue3m) * 100
                    const positive = delta >= 0
                    return (
                      <span className={positive ? 'text-success-base' : 'text-error-base'}>
                        {positive ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}% em relação à média histórica
                      </span>
                    )
                  })()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
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

  const filteredData = data && selectedCollaboratorId
    ? {
        ...data,
        pl: data.pl.filter((p) => {
          const costEntry = data.costByProject.find((c) => c.projectId === p.clockifyProjectId)
          return costEntry?.costByCollaborator[selectedCollaboratorId] !== undefined
        }),
        costByProject: data.costByProject.filter(
          (c) => c.costByCollaborator[selectedCollaboratorId] !== undefined,
        ),
      }
    : data

  const totalRevenue = data ? data.pl.filter((p) => !p.isInternal).reduce((s, p) => s + p.revenue, 0) : 0
  const netResult = data ? totalRevenue - data.totalCostAllCollaborators : 0
  const noRevenueCost = data
    ? data.pl.filter((p) => p.revenue === 0 && !p.isInternal).reduce((s, p) => s + p.cost, 0)
    : 0

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={lastUpdated ? `Atualizado ${formatLastUpdated(lastUpdated)}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker start={start} end={end} onChange={handleRangeChange} />
            <StudioPageActions
              loading={loading}
              onRefresh={() => fetchData(start, end, true)}
              onPrint={() => window.print()}
            />
          </div>
        }
      />

      <main className="flex flex-col gap-6 p-5">
        {loading && !data && <DashboardSkeleton />}

        {error && (
          <WidgetCard className="text-center">
            <p className="text-label-md text-text-strong-950">Erro ao carregar dados</p>
            <p className="mt-1 text-paragraph-sm text-text-sub-600">{error}</p>
            <Button.Root variant="primary" mode="filled" size="small" className="mt-4" onClick={() => fetchData(start, end)}>
              Tentar novamente
            </Button.Root>
          </WidgetCard>
        )}

        {data && filteredData && (
          <div className={cn('flex flex-col gap-6', loading && 'pointer-events-none opacity-60')}>
            <KPICards data={data} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatWidget
                label="Custo total (horas)"
                value={<span className="text-success-base">{fmtBRL(data.totalCostAllCollaborators)}</span>}
                delta={`${data.collaborators.length} pessoas`}
                deltaVariant="neutral"
              />
              <StatWidget
                label="Resultado líquido"
                value={
                  <span className={netResult >= 0 ? 'text-success-base' : 'text-error-base'}>
                    {netResult >= 0 ? '+' : ''}{fmtBRL(netResult)}
                  </span>
                }
                delta={netResult >= 0 ? 'superávit' : 'déficit'}
                deltaVariant={netResult >= 0 ? 'success' : 'error'}
              />
              <StatWidget
                label="Custo sem faturamento"
                value={<span className="text-error-base">{fmtBRL(noRevenueCost)}</span>}
                delta={`${data.pl.filter((p) => p.revenue === 0 && !p.isInternal).length} projetos sem receita`}
                deltaVariant="error"
              />
            </div>

            <AlertsPanel alerts={data.alerts} />
            <StrategicAnalysis pl={data.pl} monthly={data.monthly} />

            {data.pl.some((p) => p.hasAttention) && (
              <WidgetCard className="border-away-light/40 bg-away-lighter/30">
                <p className="text-label-sm text-text-strong-950">
                  <span className="text-away-base">* atenção</span> — Projetos marcados têm receita que inclui trabalho feito
                  antes de jun/2025 (início do rastreio). O custo real é maior e a margem está inflada.
                </p>
              </WidgetCard>
            )}

            {(() => {
              const todayYM = new Date().toISOString().slice(0, 7)
              const future = data.monthly.filter((m) => m.month > todayYM && m.predictedRevenue > 0)
              const next = future[0]
              const next3 = future.slice(0, 3).reduce((s, m) => s + m.predictedRevenue, 0)
              const pastR = data.monthly.filter((m) => m.month <= todayYM)
              const net = pastR.reduce((s, m) => s + m.revenue - m.cost, 0)

              return (
                <Link href="/fluxo" className="block">
                  <WidgetCard className="flex flex-wrap items-center justify-between gap-6 transition-colors hover:border-stroke-sub-300">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-paragraph-xs text-text-sub-600">Resultado acumulado</p>
                        <p className={cn('text-title-h6', net >= 0 ? 'text-success-base' : 'text-error-base')}>{fmtBRL(net)}</p>
                      </div>
                      {next3 > 0 && (
                        <div>
                          <p className="text-paragraph-xs text-text-sub-600">Previsto próx. 3 meses</p>
                          <p className="text-title-h6 text-information-base">{fmtBRL(next3)}</p>
                        </div>
                      )}
                      {next && (
                        <div>
                          <p className="text-paragraph-xs text-text-sub-600">Próxima entrada</p>
                          <p className="text-title-h6 text-text-strong-950">{next.label}</p>
                        </div>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-label-xs text-text-soft-400">
                      Ver Fluxo de Caixa
                      <RiArrowRightSLine className="size-4" />
                    </span>
                  </WidgetCard>
                </Link>
              )
            })()}

            {data.monthly.length > 0 && <MonthlyChart data={data.monthly} />}

            <div className="no-print">
              <SectionHeader title="Filtrar por colaborador" />
              <div className="flex flex-wrap gap-2">
                <Button.Root
                  variant={!selectedCollaboratorId ? 'primary' : 'neutral'}
                  mode={!selectedCollaboratorId ? 'filled' : 'stroke'}
                  size="xsmall"
                  onClick={() => setSelectedCollaboratorId('')}
                >
                  Todos
                </Button.Root>
                {data.collaborators.map((c) => (
                  <Button.Root
                    key={c.id}
                    variant={selectedCollaboratorId === c.id ? 'primary' : 'neutral'}
                    mode={selectedCollaboratorId === c.id ? 'filled' : 'stroke'}
                    size="xsmall"
                    onClick={() => setSelectedCollaboratorId(c.id === selectedCollaboratorId ? '' : c.id)}
                    style={selectedCollaboratorId === c.id ? { background: c.color, borderColor: c.color } : undefined}
                  >
                    <span
                      className="mr-1.5 inline-block size-2 rounded-full"
                      style={{ background: selectedCollaboratorId === c.id ? 'white' : c.color }}
                    />
                    {c.name}
                  </Button.Root>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CostByProjectChart data={filteredData} />
              </div>
              <CostByCollaborator data={data} onRatesChanged={() => fetchData(startRef.current, endRef.current, true)} />
            </div>

            {data.monthly.length > 1 && <RateHistoryChart data={data.monthly} />}
            <PriceSimulator collaborators={data.collaborators} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PLTable pl={filteredData.pl.filter((p) => !p.isInternal)} costByProject={filteredData.costByProject} />
              </div>
              <OperationalCosts
                months={Math.max(
                  1,
                  (new Date(end).getFullYear() - new Date(start).getFullYear()) * 12 +
                    new Date(end).getMonth() -
                    new Date(start).getMonth(),
                )}
              />
            </div>

            <InternalProjectsSection pl={data.pl.filter((p) => p.isInternal)} costByProject={data.costByProject} />
          </div>
        )}
      </main>
    </>
  )
}
