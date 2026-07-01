'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'
import { OverviewMetricsGrid } from '@/components/store/MetricAreaCard'
import {
  Avatar,
  DataTable,
  DataTableTextCell,
  DataTableUserCell,
  Badge,
} from '@/components/ds'
import type { OverviewData } from '@/types/insta2figma'
import { fmtDateTime, I2F_MIN_DATE } from '@/lib/insta2figma/constants'
import { jobStatusLabel, platformLabel } from '@/lib/insta2figma/labels'
import { pseudonymInitials } from '@/lib/insta2figma/pseudonym'

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

  const jobColumns = useMemo(
    () => [
      {
        id: 'user',
        header: 'Usuário',
        width: 'flex' as const,
        cell: (j: OverviewData['recentJobs'][0]) => (
          <DataTableUserCell
            avatar={<Avatar initials={pseudonymInitials(j.displayName)} size={32} />}
            label={j.displayName}
          />
        ),
      },
      {
        id: 'when',
        header: 'Horário',
        width: 140,
        cell: (j: OverviewData['recentJobs'][0]) => (
          <DataTableTextCell>{fmtDateTime(j.createdAt)}</DataTableTextCell>
        ),
      },
      {
        id: 'platform',
        header: 'Plataforma',
        width: 100,
        cell: (j: OverviewData['recentJobs'][0]) => (
          <DataTableTextCell>{platformLabel(j.platform)}</DataTableTextCell>
        ),
      },
      {
        id: 'profile',
        header: 'Perfil buscado',
        width: 140,
        cell: (j: OverviewData['recentJobs'][0]) => (
          <DataTableTextCell strong>@{j.profileUsername ?? '—'}</DataTableTextCell>
        ),
      },
      {
        id: 'images',
        header: 'Imagens',
        width: 90,
        align: 'right' as const,
        cell: (j: OverviewData['recentJobs'][0]) => (
          <DataTableTextCell>{j.imageCount}</DataTableTextCell>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 100,
        cell: (j: OverviewData['recentJobs'][0]) => (
          <Badge variant={j.status === 'succeeded' ? 'success' : j.status === 'failed' ? 'error' : 'neutral'}>
            {jobStatusLabel(j.status)}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <PageHeader
        title="Visão geral"
        actions={
          <DateRangePicker
            start={start}
            end={end}
            minDate={I2F_MIN_DATE}
            onChange={(s, e) => {
              setStart(s)
              setEnd(e)
            }}
          />
        }
      />
      <main className="flex flex-col gap-6 p-5">
        {error && <p className="text-paragraph-sm text-error-base">{error}</p>}

        {loading && !data && !error && (
          <div className="flex flex-col gap-4">
            <div className="h-64 animate-pulse rounded-2xl bg-bg-weak-50" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-bg-weak-50" />
              ))}
            </div>
          </div>
        )}

        {data && (
          <>
            <OverviewMetricsGrid
              kpis={data.kpis}
              className={loading ? 'pointer-events-none opacity-60' : undefined}
            />

            <div className={loading ? 'opacity-60' : ''}>
              <h2 className="mb-3 text-label-md text-text-strong-950">Importações no período</h2>
              <DataTable
                columns={jobColumns}
                data={data.recentJobs}
                keyExtractor={(j) => j.id}
                emptyMessage="Nenhuma importação no período selecionado"
              />
            </div>
          </>
        )}
      </main>
    </>
  )
}
