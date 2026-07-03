'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'
import { OverviewMetricsGrid } from '@/components/store/MetricAreaCard'
import ImportsTableSection from '@/components/store/ImportsTableSection'
import StoreDrawerStack from '@/components/store/StoreDrawerStack'
import { useStoreDrawers } from '@/components/store/useStoreDrawers'
import type { OverviewData, ImportsJobsList } from '@/types/insta2figma'
import { I2F_MIN_DATE } from '@/lib/insta2figma/constants'
import {
  useChartBuilder,
  ChartToolbar,
  ChartGrid,
} from '@/components/charts/ChartsSection'
import { PAGE_PRESETS } from '@/lib/charts/presets'

const JOBS_POLL_MS = 3 * 1000

const DEFAULT_END = new Date().toISOString().split('T')[0]
const DEFAULT_START = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
})()

export default function OverviewPage() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const charts = useChartBuilder('overview', PAGE_PRESETS.overview)

  const [jobsData, setJobsData] = useState<ImportsJobsList | null>(null)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [platform, setPlatform] = useState('all')
  const [plan, setPlan] = useState('all')
  const [status, setStatus] = useState('all')
  const [origin, setOrigin] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const hasJobsRef = useRef(false)
  const drawers = useStoreDrawers()

  const load = useCallback((rangeStart: string, rangeEnd: string) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ start: rangeStart, end: rangeEnd })
    fetch(`/api/store/insta2figma/overview?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(start, end)
  }, [load, start, end])

  const loadJobs = useCallback(
    (silent = false) => {
      if (!silent) setJobsError(null)

      const params = new URLSearchParams({
        start,
        end,
        platform,
        plan,
        status,
        origin,
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search.trim()) params.set('search', search.trim())

      fetch(`/api/store/insta2figma/imports/jobs?${params}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw new Error(d.error)
          setJobsData(d)
          hasJobsRef.current = true
        })
        .catch((e) => {
          if (!silent) setJobsError(e.message)
        })
    },
    [start, end, platform, plan, status, origin, search, page, pageSize],
  )

  useEffect(() => {
    loadJobs(hasJobsRef.current)
  }, [loadJobs])

  // Jobs em (quase) tempo real: buscas e trocas de status aparecem em até 3s.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadJobs(true)
    }, JOBS_POLL_MS)
    return () => window.clearInterval(id)
  }, [loadJobs])

  function openImportFromRow(row: { id: string; userId: string; displayName: string }) {
    // Linhas de busca (pré-job) não têm detalhe para abrir.
    if (row.id.startsWith('search-')) return
    drawers.openImport(row.id, { userId: row.userId, displayName: row.displayName })
  }

  return (
    <>
      <PageHeader
        title="Visão geral"
        actions={
          <div className="flex items-center gap-2">
            <DateRangePicker
              start={start}
              end={end}
              minDate={I2F_MIN_DATE}
              onChange={(s, e) => {
                setStart(s)
                setEnd(e)
                setPage(1)
              }}
            />
            <ChartToolbar builder={charts} />
          </div>
        }
      />
      <main className="flex flex-col gap-6 p-5">
        {error && <p className="text-paragraph-sm text-error-base">{error}</p>}

        {loading && !data && !error && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="h-64 animate-pulse rounded-2xl bg-bg-weak-50 md:col-span-2" />
              <div className="h-64 animate-pulse rounded-2xl bg-bg-weak-50" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-bg-weak-50" />
              ))}
            </div>
          </div>
        )}

        {data && (
          <OverviewMetricsGrid
            kpis={data.kpis}
            attentionPoints={data.attentionPoints}
            className={loading ? 'pointer-events-none opacity-60' : undefined}
          />
        )}

        {jobsError && <p className="text-paragraph-sm text-error-base">{jobsError}</p>}

        {!jobsData && !jobsError && (
          <div className="h-96 animate-pulse rounded-2xl bg-bg-weak-50" />
        )}

        {jobsData && (
          <ImportsTableSection
            jobs={jobsData.jobs}
            total={jobsData.total}
            page={page}
            pageSize={pageSize}
            platform={platform}
            plan={plan}
            status={status}
            origin={origin}
            search={search}
            onPlatformChange={(v) => {
              setPlatform(v)
              setPage(1)
            }}
            onPlanChange={(v) => {
              setPlan(v)
              setPage(1)
            }}
            onStatusChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            onOriginChange={(v) => {
              setOrigin(v)
              setPage(1)
            }}
            onSearchChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
            onRowClick={openImportFromRow}
          />
        )}

        {data && (
          <div>
            <h2 className="mb-3 text-label-md text-text-strong-950">Gráficos</h2>
            <ChartGrid builder={charts} start={start} end={end} />
          </div>
        )}
      </main>

      <StoreDrawerStack {...drawers} />
    </>
  )
}
