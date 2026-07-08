'use client'

import { useMemo } from 'react'
import { RiLoader4Line, RiSearch2Line } from '@remixicon/react'
import * as StatusBadge from '@/components/ui/status-badge'
import {
  Avatar,
  Badge,
  DataTable,
  DataTableTextCell,
  DataTableUserCell,
  WidgetCard,
} from '@/components/ds'
import DataPagination from '@/components/ds/DataPagination'
import FilterSelect from '@/components/ds/FilterSelect'
import type { ImportJobRow } from '@/types/insta2figma'
import { fmtDateTime, fmtDuration } from '@/lib/insta2figma/constants'
import {
  countryFlag,
  jobStatusLabel,
  ORIGIN_FILTER_OPTIONS,
  PLAN_FILTER_OPTIONS,
  PLATFORM_FILTER_OPTIONS,
  planLabel,
  STATUS_FILTER_OPTIONS,
} from '@/lib/insta2figma/labels'
import { pseudonymColor } from '@/lib/insta2figma/pseudonym'
import { PlatformTableCell } from '@/components/store/PlatformIcon'
import ScrapeSourceBadge from '@/components/store/ScrapeSourceBadge'

/*
 * Estados de build: buscando → importando → concluído/falhou.
 * "Buscado" = só buscou, nunca importou (linha vinda de profile_search_logs).
 */
const JOB_STAGE: Record<
  ImportJobRow['status'],
  { label: string; status: StatusBadge.StatusBadgeStatus; spin?: boolean }
> = {
  searching: { label: 'Buscando', status: 'pending', spin: true },
  searched: { label: 'Buscado', status: 'disabled' },
  queued: { label: 'Na fila', status: 'pending', spin: true },
  running: { label: 'Importando', status: 'pending', spin: true },
  succeeded: { label: 'Concluído', status: 'completed' },
  failed: { label: 'Falhou', status: 'failed' },
  canceled: { label: 'Cancelado', status: 'disabled' },
}

export function JobStatusBadge({
  status,
  errorMessage,
}: {
  status: ImportJobRow['status']
  errorMessage?: string | null
}) {
  // Perfil privado não é falha do sistema — badge neutro "Privado".
  const isPrivateProfile =
    status === 'failed' && /private/i.test(errorMessage ?? '')
  const stage = isPrivateProfile
    ? { label: 'Privado', status: 'disabled' as const }
    : (JOB_STAGE[status] ?? { label: jobStatusLabel(status), status: 'disabled' as const })
  return (
    <StatusBadge.Root status={stage.status} variant="stroke">
      {stage.spin ? (
        <StatusBadge.Icon as={RiLoader4Line} status={stage.status} className="animate-spin" />
      ) : (
        <StatusBadge.Dot status={stage.status} />
      )}
      {stage.label}
    </StatusBadge.Root>
  )
}

const PLAN_BADGE = {
  free: 'neutral',
  pro: 'info',
  max: 'success',
} as const

type ImportsTableSectionProps = {
  jobs: ImportJobRow[]
  total: number
  page: number
  pageSize: number
  platform: string
  plan: string
  status: string
  origin: string
  search: string
  onPlatformChange: (value: string) => void
  onPlanChange: (value: string) => void
  onStatusChange: (value: string) => void
  onOriginChange: (value: string) => void
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRowClick?: (row: ImportJobRow) => void
  className?: string
}

export default function ImportsTableSection({
  jobs,
  total,
  page,
  pageSize,
  platform,
  plan,
  status,
  origin,
  search,
  onPlatformChange,
  onPlanChange,
  onStatusChange,
  onOriginChange,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  className,
}: ImportsTableSectionProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const columns = useMemo(
    () => [
      {
        id: 'user',
        header: 'Usuário',
        width: 160 as const,
        cell: (row: ImportJobRow) => (
          <DataTableUserCell
            avatar={<Avatar colorKey={pseudonymColor(row.userId)} size={32} />}
            label={row.displayName}
          />
        ),
      },
      {
        id: 'when',
        header: 'Horário',
        width: 120,
        cell: (row: ImportJobRow) => <DataTableTextCell>{fmtDateTime(row.createdAt)}</DataTableTextCell>,
      },
      {
        id: 'plan',
        header: 'Plano',
        width: 72,
        cell: (row: ImportJobRow) => (
          <Badge variant={PLAN_BADGE[row.planTier]}>{planLabel(row.planTier)}</Badge>
        ),
      },
      {
        id: 'platform',
        header: 'Plataforma',
        width: 110,
        cell: (row: ImportJobRow) => <PlatformTableCell platform={row.platform} />,
      },
      {
        id: 'country',
        header: 'País',
        width: 60,
        cell: (row: ImportJobRow) => (
          <DataTableTextCell>
            {countryFlag(row.countryCode) ?? '—'}
          </DataTableTextCell>
        ),
      },
      {
        id: 'origin',
        header: 'Origem',
        width: 100,
        cell: (row: ImportJobRow) => <ScrapeSourceBadge source={row.scrapeSource} />,
      },
      {
        id: 'profile',
        header: 'Perfil',
        width: 130,
        cell: (row: ImportJobRow) => (
          <DataTableTextCell strong>
            {row.profileUsername ? `@${row.profileUsername}` : '—'}
          </DataTableTextCell>
        ),
      },
      {
        id: 'posts',
        header: 'Posts',
        width: 64,
        align: 'right' as const,
        cell: (row: ImportJobRow) => (
          <DataTableTextCell>{row.postsRequested ?? '—'}</DataTableTextCell>
        ),
      },
      {
        id: 'images',
        header: 'Imagens',
        width: 72,
        align: 'right' as const,
        cell: (row: ImportJobRow) => <DataTableTextCell>{row.imageCount}</DataTableTextCell>,
      },
      {
        id: 'duration',
        header: 'Duração',
        width: 84,
        cell: (row: ImportJobRow) => (
          <DataTableTextCell>{fmtDuration(row.durationMs)}</DataTableTextCell>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 116,
        cell: (row: ImportJobRow) => (
          <JobStatusBadge status={row.status} errorMessage={row.errorMessage} />
        ),
      },
    ],
    [],
  )

  return (
    <WidgetCard className={className}>
      <div className="mb-4">
        <p className="text-label-sm text-text-strong-950">Importações no período</p>
        <p className="mt-0.5 text-paragraph-xs text-text-soft-400">
          {total.toLocaleString('pt-BR')} registro{total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={platform}
            onChange={onPlatformChange}
            options={PLATFORM_FILTER_OPTIONS}
            aria-label="Plataforma"
          />
          <FilterSelect
            value={plan}
            onChange={onPlanChange}
            options={PLAN_FILTER_OPTIONS}
            aria-label="Plano"
          />
          <FilterSelect
            value={status}
            onChange={onStatusChange}
            options={STATUS_FILTER_OPTIONS}
            aria-label="Status"
          />
          <FilterSelect
            value={origin}
            onChange={onOriginChange}
            options={ORIGIN_FILTER_OPTIONS}
            aria-label="Origem"
          />
        </div>

        <div className="relative w-full max-w-[320px]">
          <RiSearch2Line className="pointer-events-none absolute left-2.5 top-1/2 size-5 -translate-y-1/2 text-text-soft-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por perfil (@username)..."
            className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-2 pl-10 pr-2 text-paragraph-sm text-text-strong-950 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)] outline-none placeholder:text-text-soft-400 focus:border-stroke-sub-300"
          />
        </div>
      </div>

      <div>
        <DataTable
          columns={columns}
          data={jobs}
          keyExtractor={(row) => row.id}
          onRowClick={onRowClick}
          emptyMessage="Nenhuma importação encontrada"
        />
        <DataPagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </WidgetCard>
  )
}
