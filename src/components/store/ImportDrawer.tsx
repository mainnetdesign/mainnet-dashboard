'use client'

import { RiArrowRightSLine, RiCloseLine } from '@remixicon/react'
import Badge from '@/components/ds/Badge'
import { DataTable, DataTableTextCell, WidgetCard } from '@/components/ds'
import ImportFlowTimeline from '@/components/store/ImportFlowTimeline'
import ScrapeSourceBadge from '@/components/store/ScrapeSourceBadge'
import { PlatformTableCell } from '@/components/store/PlatformIcon'
import type { ImportJobDetail, ScrapeTelemetryEntry } from '@/types/insta2figma'
import { fmtDateTime, fmtDuration } from '@/lib/insta2figma/constants'
import {
  formatJobError,
  jobStatusLabel,
  jobTypeLabel,
  planLabel,
  scrapeEndpointLabel,
  selectionModeLabel,
  timelineOrderLabel,
} from '@/lib/insta2figma/labels'
import { cn } from '@/utils/cn'

type ImportParent = {
  userId: string
  displayName: string
}

type ImportDrawerProps = {
  job: ImportJobDetail | null
  loading?: boolean
  parent: ImportParent | null
  onClose: () => void
  onBreadcrumbUserClick: () => void
}

const STATUS_VARIANT = {
  succeeded: 'success',
  failed: 'error',
  running: 'info',
  queued: 'neutral',
  canceled: 'neutral',
} as const

const PLAN_VARIANT = {
  free: 'neutral',
  pro: 'info',
  max: 'success',
} as const

function DetailField({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-text-soft-400">{label}</dt>
      <dd className={cn(mono && 'break-all font-mono')}>{value}</dd>
    </div>
  )
}

function ScrapeTelemetryTable({ rows }: { rows: ScrapeTelemetryEntry[] }) {
  return (
    <DataTable
      columns={[
        {
          id: 'when',
          header: 'Horário',
          width: 110,
          cell: (row) => <DataTableTextCell>{fmtDateTime(row.createdAt)}</DataTableTextCell>,
        },
        {
          id: 'endpoint',
          header: 'Endpoint',
          width: 130,
          cell: (row) => <DataTableTextCell>{scrapeEndpointLabel(row.endpoint)}</DataTableTextCell>,
        },
        {
          id: 'status',
          header: 'HTTP',
          width: 60,
          align: 'right',
          cell: (row) => (
            <DataTableTextCell>
              <span className={row.statusCode >= 400 ? 'text-error-base' : undefined}>
                {row.statusCode}
              </span>
            </DataTableTextCell>
          ),
        },
        {
          id: 'latency',
          header: 'Latência',
          width: 80,
          align: 'right',
          cell: (row) => <DataTableTextCell>{fmtDuration(row.latencyMs)}</DataTableTextCell>,
        },
        {
          id: 'meta',
          header: 'Detalhes',
          width: 'flex',
          cell: (row) => (
            <DataTableTextCell>
              {[
                row.cacheHit ? 'cache' : null,
                row.proxyUsed ? 'proxy' : null,
                row.sessionAccount ? row.sessionAccount : null,
                row.errorKind,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </DataTableTextCell>
          ),
        },
      ]}
      data={rows}
      keyExtractor={(row) => row.id}
      emptyMessage="Sem telemetria de scrape"
    />
  )
}

export default function ImportDrawer({
  job,
  loading,
  parent,
  onClose,
  onBreadcrumbUserClick,
}: ImportDrawerProps) {
  if (!job && !loading) return null

  const profileLabel = job?.profileUsername ? `@${job.profileUsername}` : 'Importação'

  return (
    <aside
      className={cn(
        'fixed inset-y-0 right-0 z-[60] flex w-full max-w-2xl flex-col border-l border-stroke-soft-200 bg-bg-white-0 shadow-xl',
      )}
    >
      <div className="border-b border-stroke-soft-200 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {parent && (
              <nav aria-label="Navegação" className="mb-2 flex min-w-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={onBreadcrumbUserClick}
                  className="truncate text-paragraph-xs text-text-sub-600 transition-colors hover:text-text-strong-950"
                >
                  {parent.displayName}
                </button>
                <RiArrowRightSLine className="size-4 shrink-0 text-text-soft-400" aria-hidden />
                <span className="truncate text-paragraph-xs text-text-strong-950">
                  {profileLabel}
                </span>
              </nav>
            )}
            <h2 className="text-label-lg text-text-strong-950">Detalhes da importação</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1 hover:bg-bg-weak-50">
            <RiCloseLine className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && <p className="text-paragraph-sm text-text-soft-400">Carregando...</p>}

        {job && (
          <div className="space-y-5">
            <WidgetCard>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[job.status] ?? 'neutral'}>
                    {jobStatusLabel(job.status)}
                  </Badge>
                  <Badge variant={PLAN_VARIANT[job.planTier]}>{planLabel(job.planTier)}</Badge>
                  <PlatformTableCell platform={job.platform} />
                  <ScrapeSourceBadge source={job.scrapeSource} />
                </div>

                <div>
                  <p className="text-label-md text-text-strong-950">
                    {job.profileUsername ? `@${job.profileUsername}` : 'Perfil não informado'}
                  </p>
                  <p className="mt-1 text-paragraph-xs text-text-soft-400">
                    {job.imageCount} imagem{job.imageCount === 1 ? '' : 's'}
                    {job.postsRequested != null ? ` · ${job.postsRequested} posts solicitados` : ''}
                    {' · '}
                    {jobTypeLabel(job.jobType)}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-paragraph-xs sm:grid-cols-4">
                  <DetailField label="Criado" value={fmtDateTime(job.createdAt)} />
                  <DetailField label="Duração" value={fmtDuration(job.durationMs)} />
                  <DetailField label="Início" value={job.startedAt ? fmtDateTime(job.startedAt) : '—'} />
                  <DetailField label="Fim" value={job.finishedAt ? fmtDateTime(job.finishedAt) : '—'} />
                </dl>
              </div>
            </WidgetCard>

            {job.flow && <ImportFlowTimeline flow={job.flow} />}

            <WidgetCard>
              <p className="mb-3 text-label-sm text-text-strong-950">Parâmetros da importação</p>
              <dl className="grid grid-cols-2 gap-3 text-paragraph-xs">
                <DetailField label="Modo de seleção" value={selectionModeLabel(job.input.selectionMode)} />
                <DetailField label="Ordem" value={timelineOrderLabel(job.input.timelineOrder)} />
                <DetailField
                  label="Posts solicitados"
                  value={job.postsRequested != null ? String(job.postsRequested) : '—'}
                />
                <DetailField
                  label="Expandir carrossel"
                  value={job.input.expandCarouselImages ? 'Sim' : 'Não'}
                />
                <DetailField label="Ignorar reels" value={job.input.ignoreReels ? 'Sim' : 'Não'} />
                {job.input.startIndex != null && (
                  <DetailField label="Índice inicial" value={String(job.input.startIndex)} />
                )}
                {job.resultSummarySource && (
                  <DetailField label="Fonte (resultado)" value={job.resultSummarySource} mono />
                )}
              </dl>
            </WidgetCard>

            {job.igProfile && (
              <WidgetCard>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="text-label-sm text-text-strong-950">Perfil Instagram</p>
                  {job.igProfile.isVerified && <Badge variant="info">Verificado</Badge>}
                  {job.igProfile.isPrivate && <Badge variant="warning">Privado</Badge>}
                  {job.igProfile.catalogComplete && <Badge variant="success">Catálogo completo</Badge>}
                </div>
                <dl className="grid grid-cols-2 gap-3 text-paragraph-xs">
                  <DetailField
                    label="Nome"
                    value={job.igProfile.fullName?.trim() || job.igProfile.username}
                  />
                  <DetailField label="Seguidores" value={job.igProfile.followerCount.toLocaleString('pt-BR')} />
                  <DetailField label="Seguindo" value={job.igProfile.followingCount.toLocaleString('pt-BR')} />
                  <DetailField label="Posts no IG" value={job.igProfile.mediaCount.toLocaleString('pt-BR')} />
                  <DetailField
                    label="Último scrape"
                    value={job.igProfile.lastScrapedAt ? fmtDateTime(job.igProfile.lastScrapedAt) : '—'}
                  />
                </dl>
              </WidgetCard>
            )}

            {job.scrapeTelemetry.length > 0 && (
              <WidgetCard>
                <p className="mb-3 text-label-sm text-text-strong-950">Telemetria de scrape</p>
                <ScrapeTelemetryTable rows={job.scrapeTelemetry} />
              </WidgetCard>
            )}

            {job.status === 'failed' && (
              <WidgetCard>
                <p className="mb-2 text-label-sm text-text-strong-950">Erro</p>
                <p className="break-all font-mono text-paragraph-xs text-text-sub-600">
                  {formatJobError(job.errorCode, job.errorMessage)}
                </p>
              </WidgetCard>
            )}

            <WidgetCard>
              <p className="mb-2 text-label-sm text-text-strong-950">Identificadores</p>
              <dl className="space-y-2 text-paragraph-xs">
                <div>
                  <dt className="text-text-soft-400">Job ID</dt>
                  <dd className="break-all font-mono">{job.id}</dd>
                </div>
                {job.flow && (
                  <div>
                    <dt className="text-text-soft-400">Flow ID</dt>
                    <dd className="break-all font-mono">{job.flow.id}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-text-soft-400">Usuário</dt>
                  <dd>{job.displayName}</dd>
                </div>
              </dl>
            </WidgetCard>
          </div>
        )}
      </div>
    </aside>
  )
}
