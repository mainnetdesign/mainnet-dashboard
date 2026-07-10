'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RiDownloadLine } from '@remixicon/react'
import PageHeader from '@/components/shell/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'
import { UsersMetricsGrid } from '@/components/store/MetricAreaCard'
import FilterBar from '@/components/ds/FilterBar'
import DataPagination from '@/components/ds/DataPagination'
import {
  Avatar,
  Badge,
  DataTable,
  DataTableTextCell,
  DataTableUserCell,
} from '@/components/ds'
import StoreDrawerStack from '@/components/store/StoreDrawerStack'
import { useStoreDrawers } from '@/components/store/useStoreDrawers'
import { PlatformTableCell } from '@/components/store/PlatformIcon'
import type { UsersListData } from '@/types/insta2figma'
import { fmtDate, fmtDateTime, I2F_MIN_DATE } from '@/lib/insta2figma/constants'
import { PLAN_FILTER_OPTIONS, planLabel } from '@/lib/insta2figma/labels'
import { pseudonymColor } from '@/lib/insta2figma/pseudonym'

const PLAN_BADGE = {
  free: 'neutral',
  pro: 'info',
  max: 'success',
} as const

const DEFAULT_END = new Date().toISOString().split('T')[0]
const DEFAULT_START = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
})()

export default function UsersPage() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [data, setData] = useState<UsersListData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const drawers = useStoreDrawers()

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      start,
      end,
      page: String(page),
      pageSize: String(pageSize),
      plan,
    })
    if (search) params.set('search', search)

    fetch(`/api/store/insta2figma/users?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [start, end, page, pageSize, plan, search])

  useEffect(() => {
    load()
  }, [load])

  function openUser(id: string) {
    drawers.openUser(id)
  }

  function exportCSV() {
    if (!data) return
    const header = 'nome,plano,verificado,plataforma,imagens,criado_em,ultimo_import\n'
    const lines = data.users.map((u) =>
      [u.displayName, planLabel(u.planTier), u.emailVerified ? 'sim' : 'não', u.platform ?? '', u.imagesUsed, u.createdAt, u.lastImportAt ?? ''].join(','),
    )
    const blob = new Blob([header + lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'insta2figma-users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = useMemo(
    () => [
      {
        id: 'user',
        header: 'Usuário',
        width: 'flex' as const,
        sortable: true,
        cell: (u: UsersListData['users'][0]) => (
          <button type="button" onClick={() => openUser(u.id)} className="w-full text-left">
            <DataTableUserCell
              avatar={<Avatar colorKey={pseudonymColor(u.id)} size={32} />}
              label={u.displayName}
            />
          </button>
        ),
      },
      {
        id: 'plan',
        header: 'Plano',
        width: 90,
        cell: (u: UsersListData['users'][0]) => (
          <Badge variant={PLAN_BADGE[u.planTier]}>{planLabel(u.planTier)}</Badge>
        ),
      },
      {
        id: 'verified',
        header: 'Verificado',
        width: 110,
        cell: (u: UsersListData['users'][0]) => (
          <Badge variant={u.emailVerified ? 'success' : 'warning'}>
            {u.emailVerified ? 'Sim' : 'Não'}
          </Badge>
        ),
      },
      {
        id: 'platform',
        header: 'Plataforma',
        width: 120,
        cell: (u: UsersListData['users'][0]) => <PlatformTableCell platform={u.platform} />,
      },
      {
        id: 'images',
        header: 'Imagens',
        width: 90,
        align: 'right' as const,
        cell: (u: UsersListData['users'][0]) => <DataTableTextCell>{u.imagesUsed}</DataTableTextCell>,
      },
      {
        id: 'joined',
        header: 'Entrou',
        width: 110,
        cell: (u: UsersListData['users'][0]) => <DataTableTextCell>{fmtDate(u.createdAt)}</DataTableTextCell>,
      },
      {
        id: 'last',
        header: 'Último import',
        width: 130,
        cell: (u: UsersListData['users'][0]) => (
          <DataTableTextCell>{u.lastImportAt ? fmtDateTime(u.lastImportAt) : '—'}</DataTableTextCell>
        ),
      },
    ],
    [],
  )

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1

  return (
    <>
      <PageHeader
        title="Usuários"
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={exportCSV}
              disabled={!data?.users.length}
              className="mn-pressable inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 px-3 py-1.5 text-label-sm text-text-sub-600 hover:bg-bg-weak-50 disabled:opacity-50"
            >
              <RiDownloadLine className="size-4" />
              Exportar CSV
            </button>
          </div>
        }
      />
      <main className="flex flex-col gap-6 p-5">
        {error && <p className="text-paragraph-sm text-error-base">{error}</p>}

        {loading && !data && !error && (
          <div className="flex flex-col gap-4">
            <div className="mn-shimmer h-64 rounded-2xl" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mn-shimmer h-44 rounded-2xl" />
              ))}
            </div>
          </div>
        )}

        {data && (
          <div className="mn-page-stagger flex flex-col gap-6">
            <UsersMetricsGrid
              kpis={data.kpis}
              className={loading ? 'pointer-events-none opacity-60' : undefined}
            />

            <FilterBar
              segments={PLAN_FILTER_OPTIONS.map(({ value, label }) => ({ value, label }))}
              segmentValue={plan}
              onSegmentChange={(v) => {
                setPlan(v)
                setPage(1)
              }}
              searchValue={search}
              onSearchChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              searchPlaceholder="Buscar por nome..."
            />

            <DataTable columns={columns} data={data.users} keyExtractor={(u) => u.id} />
            <DataPagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s)
                setPage(1)
              }}
            />
          </div>
        )}
      </main>

      <StoreDrawerStack {...drawers} />
    </>
  )
}
