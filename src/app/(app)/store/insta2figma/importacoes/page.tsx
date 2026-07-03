'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'
import { ImportsMetricsGrid } from '@/components/store/MetricAreaCard'
import ProfileRankingChart from '@/components/store/ProfileRankingChart'
import FailedImportsSection from '@/components/store/FailedImportsSection'
import ImportsTableSection from '@/components/store/ImportsTableSection'
import StoreDrawerStack from '@/components/store/StoreDrawerStack'
import { useStoreDrawers } from '@/components/store/useStoreDrawers'
import type { ImportsData, ImportsJobsList } from '@/types/insta2figma'
import { I2F_MIN_DATE } from '@/lib/insta2figma/constants'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const JOBS_POLL_MS = 3 * 1000

const DEFAULT_END = new Date().toISOString().split('T')[0]
const DEFAULT_START = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
})()

export default function ImportacoesPage() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [data, setData] = useState<ImportsData | null>(null)
  const [jobsData, setJobsData] = useState<ImportsJobsList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [initialSummaryLoading, setInitialSummaryLoading] = useState(true)
  const [initialJobsLoading, setInitialJobsLoading] = useState(true)

  const [platform, setPlatform] = useState('all')
  const [plan, setPlan] = useState('all')
  const [status, setStatus] = useState('all')
  const [origin, setOrigin] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const hasSummaryRef = useRef(false)
  const hasJobsRef = useRef(false)
  const drawers = useStoreDrawers()

  const loadSummary = useCallback((rangeStart: string, rangeEnd: string, silent = false) => {
    if (!silent && !hasSummaryRef.current) setInitialSummaryLoading(true)
    if (!silent) setError(null)

    const params = new URLSearchParams({ start: rangeStart, end: rangeEnd })
    fetch(`/api/store/insta2figma/imports?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
        hasSummaryRef.current = true
      })
      .catch((e) => {
        if (!silent) setError(e.message)
      })
      .finally(() => setInitialSummaryLoading(false))
  }, [])

  const loadJobs = useCallback((silent = false) => {
    if (!silent && !hasJobsRef.current) setInitialJobsLoading(true)
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
      .finally(() => setInitialJobsLoading(false))
  }, [start, end, platform, plan, status, origin, search, page, pageSize])

  useEffect(() => {
    loadSummary(start, end, hasSummaryRef.current)
  }, [loadSummary, start, end])

  useEffect(() => {
    loadJobs(hasJobsRef.current)
  }, [loadJobs])

  useEffect(() => {
    const id = window.setInterval(() => loadSummary(start, end, true), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [start, end, loadSummary])

  // Jobs em (quase) tempo real: novas importações e trocas de status aparecem em até 5s.
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
        title="Importações"
        actions={
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
        }
      />
      <main className="flex flex-col gap-6 p-5">
        {error && <p className="text-paragraph-sm text-error-base">{error}</p>}

        {initialSummaryLoading && !data && !error && (
          <div className="flex flex-col gap-4">
            <div className="h-64 animate-pulse rounded-2xl bg-bg-weak-50" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-bg-weak-50" />
              ))}
            </div>
          </div>
        )}

        {data && <ImportsMetricsGrid kpis={data.kpis} />}

        {jobsError && <p className="text-paragraph-sm text-error-base">{jobsError}</p>}

        {initialJobsLoading && !jobsData && !jobsError && (
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
          <>
            <FailedImportsSection
              failedImports={data.failedImports}
              errorSummary={data.errorSummary}
              onRowClick={openImportFromRow}
            />
            <ProfileRankingChart profiles={data.topProfiles} />
          </>
        )}
      </main>

      <StoreDrawerStack {...drawers} />
    </>
  )
}
