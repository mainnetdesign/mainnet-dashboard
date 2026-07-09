'use client'

import { useMemo, useState } from 'react'
import { ProjectPL, ProjectCostData } from '@/types'
import WidgetCard from '@/components/ds/WidgetCard'
import Badge from '@/components/ds/Badge'
import DataTable, { DataTableTextCell, type DataTableColumn } from '@/components/ds/DataTable'
import * as Button from '@/components/ui/button'
import { RiCloseLine, RiDownloadLine, RiSearch2Line } from '@remixicon/react'
import { cn } from '@/utils/cn'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

type Filter = 'all' | 'profit' | 'loss' | 'low-margin'

interface Props {
  pl: ProjectPL[]
  costByProject: ProjectCostData[]
  embedded?: boolean
}

function exportCSV(rows: ProjectPL[]) {
  const header = ['Projeto', 'Horas', 'Receita', 'Custo', 'Resultado', 'Margem %', 'Status']
  const lines = rows.map((p) => [
    `"${p.clockifyProjectName.replace(/"/g, '""')}"`,
    Math.round(p.hours),
    p.revenue.toFixed(2),
    p.cost.toFixed(2),
    p.result.toFixed(2),
    p.margin !== null ? p.margin.toFixed(1) : '',
    p.status,
  ].join(','))
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pl_mainnet_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ProjectDrawer({
  project,
  costData,
  onClose,
}: {
  project: ProjectPL
  costData: ProjectCostData | undefined
  onClose: () => void
}) {
  const collabs = costData
    ? Object.entries(costData.costByCollaborator).sort((a, b) => b[1].cost - a[1].cost)
    : []

  const statCells = [
    { label: 'Horas', value: `${Math.round(project.hours)}h`, className: 'text-away-base' },
    { label: 'Custo', value: fmtBRL(project.cost), className: 'text-error-base' },
    {
      label: 'Receita',
      value: project.revenue > 0 ? fmtBRL(project.revenue) : '—',
      className: project.revenue > 0 ? 'text-success-base' : 'text-text-soft-400',
    },
    {
      label: 'Resultado',
      value: `${project.result >= 0 ? '+' : ''}${fmtBRL(project.result)}`,
      className: project.result >= 0 ? 'text-success-base' : 'text-error-base',
    },
  ]

  return (
    <>
      <div className="mn-drawer-backdrop fixed inset-0 z-40 bg-black/40 no-print backdrop-blur-[2px]" onClick={onClose} />
      <div className="mn-drawer-panel fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col rounded-l-2xl border-l border-stroke-soft-200 bg-bg-white-0 shadow-[0_8px_40px_rgba(10,13,20,0.12)] no-print">
        <div className="flex items-start justify-between border-b border-stroke-soft-200 p-5">
          <div>
            <h3 className="text-title-h6 text-text-strong-950">
              {project.clockifyProjectName}
              {project.hasAttention && <span className="ml-2 text-paragraph-xs text-away-base">* atenção</span>}
            </h3>
            <Badge
              variant={project.status === 'Lucro' ? 'success' : project.status === 'Prejuízo' ? 'error' : 'warning'}
              className="mt-2"
            >
              {project.status}
            </Badge>
          </div>
          <Button.Root variant="neutral" mode="ghost" size="xsmall" onClick={onClose}>
            <Button.Icon as={RiCloseLine} />
          </Button.Root>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-stroke-soft-200 p-5">
          {statCells.map((cell) => (
            <div key={cell.label} className="rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4">
              <p className="text-label-2xs text-text-sub-600">{cell.label}</p>
              <p className={cn('mt-1 text-title-h5', cell.className)}>{cell.value}</p>
            </div>
          ))}
          {project.margin !== null && (
            <div className="col-span-2 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4">
              <p className="mb-2 text-label-2xs text-text-sub-600">Margem</p>
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stroke-soft-200">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      project.margin >= 40 ? 'bg-success-base' : project.margin >= 20 ? 'bg-away-base' : 'bg-error-base',
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, project.margin))}%` }}
                  />
                </div>
                <span
                  className={cn(
                    'w-10 text-right text-label-sm',
                    project.margin >= 40 ? 'text-success-base' : project.margin >= 20 ? 'text-away-base' : 'text-error-base',
                  )}
                >
                  {Math.round(project.margin)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <h4 className="mb-4 text-label-2xs text-text-sub-600">Breakdown por colaborador</h4>
          {collabs.length === 0 ? (
            <p className="text-paragraph-sm text-text-sub-600">Nenhum dado de colaborador disponível.</p>
          ) : (
            <div className="space-y-3">
              {collabs.map(([userId, data]) => {
                const pct = project.cost > 0 ? (data.cost / project.cost) * 100 : 0
                return (
                  <div key={userId} className="rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: data.color }} />
                        <span className="text-label-sm text-text-strong-950">{data.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-label-sm text-error-base">{fmtBRL(data.cost)}</span>
                        <span className="ml-2 text-paragraph-xs text-away-base">{Math.round(data.hours)}h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stroke-soft-200">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: data.color }} />
                      </div>
                      <span className="w-8 text-right text-paragraph-xs text-text-sub-600">{Math.round(pct)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function PLTable({ pl, costByProject, embedded = false }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ProjectPL | null>(null)

  const filtered = pl.filter((p) => {
    if (filter === 'profit' && p.status !== 'Lucro') return false
    if (filter === 'loss' && p.status !== 'Prejuízo') return false
    if (filter === 'low-margin' && p.status !== 'Margem baixa') return false
    if (search.trim()) return p.clockifyProjectName.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const columns = useMemo<DataTableColumn<ProjectPL>[]>(
    () => [
      {
        id: 'project',
        header: 'Projeto',
        width: 'flex',
        sortValue: (p) => p.clockifyProjectName,
        cell: (p) => (
          <div className="flex min-w-0 items-center gap-2">
            <DataTableTextCell strong>
              {p.clockifyProjectName}
              {p.hasAttention && <span className="ml-1.5 text-paragraph-xs text-away-base">*</span>}
            </DataTableTextCell>
            {p.hours === 0 && p.revenue > 0 && <Badge variant="neutral">sem horas</Badge>}
          </div>
        ),
      },
      {
        id: 'hours',
        header: 'Horas',
        width: 72,
        align: 'right',
        sortValue: (p) => p.hours,
        cell: (p) => <span className="text-label-sm text-away-base">{Math.round(p.hours)}h</span>,
      },
      {
        id: 'revenue',
        header: 'Receita',
        width: 100,
        align: 'right',
        sortValue: (p) => p.revenue,
        cell: (p) => (
          <span className={cn('text-label-sm', p.revenue > 0 ? 'text-success-base' : 'text-text-soft-400')}>
            {p.revenue > 0 ? fmtBRL(p.revenue) : '—'}
          </span>
        ),
      },
      {
        id: 'cost',
        header: 'Custo',
        width: 100,
        align: 'right',
        sortValue: (p) => p.cost,
        cell: (p) => <span className="text-paragraph-sm text-error-base">{fmtBRL(p.cost)}</span>,
      },
      {
        id: 'result',
        header: 'Resultado',
        width: 110,
        align: 'right',
        sortValue: (p) => p.result,
        cell: (p) => (
          <span className={cn('text-label-sm', p.result >= 0 ? 'text-success-base' : 'text-error-base')}>
            {p.result >= 0 ? '+' : ''}{fmtBRL(p.result)}
          </span>
        ),
      },
      {
        id: 'margin',
        header: 'Margem',
        width: 72,
        align: 'right',
        sortValue: (p) => p.margin ?? -999,
        cell: (p) => (
          <span
            className={cn(
              'text-label-sm',
              p.margin === null
                ? 'text-text-soft-400'
                : p.margin >= 40
                  ? 'text-success-base'
                  : p.margin >= 20
                    ? 'text-away-base'
                    : 'text-error-base',
            )}
          >
            {p.margin !== null ? `${Math.round(p.margin)}%` : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 110,
        align: 'right',
        sortable: false,
        cell: (p) => (
          <Badge variant={p.status === 'Lucro' ? 'success' : p.status === 'Prejuízo' ? 'error' : 'warning'}>
            {p.status}
          </Badge>
        ),
      },
    ],
    [],
  )

  const filters: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'profit', label: 'Lucro' },
    { key: 'loss', label: 'Prejuízo' },
    { key: 'low-margin', label: 'Margem baixa' },
  ]

  const selectedCostData = selected
    ? costByProject.find((c) => c.projectId === selected.clockifyProjectId)
    : undefined

  const tableBody = (
    <>
      <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-4', embedded && 'px-1')}>
          <div>
            <p className="text-label-sm text-text-strong-950">P&L por projeto</p>
            <p className="mt-0.5 text-paragraph-xs text-text-soft-400">
              Custo = horas reais × custo/hora · clique em qualquer linha para ver detalhes
            </p>
          </div>
          <Button.Root variant="neutral" mode="stroke" size="small" onClick={() => exportCSV(filtered)} className="no-print">
            <Button.Icon as={RiDownloadLine} />
            Exportar CSV
          </Button.Root>
        </div>

        <div className="no-print mb-4 flex flex-col gap-3">
          <div className="relative w-full max-w-sm">
            <RiSearch2Line className="pointer-events-none absolute left-2.5 top-1/2 size-5 -translate-y-1/2 text-text-soft-400" />
            <input
              type="search"
              placeholder="Buscar projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-2 pl-10 pr-3 text-paragraph-sm text-text-strong-950 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)] outline-none placeholder:text-text-soft-400 focus:border-stroke-sub-300"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button.Root
                key={f.key}
                variant={filter === f.key ? 'primary' : 'neutral'}
                mode={filter === f.key ? 'filled' : 'stroke'}
                size="xsmall"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button.Root>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(p) => p.clockifyProjectId}
          onRowClick={setSelected}
          defaultSort={{ columnId: 'result', direction: 'desc' }}
          emptyMessage="Nenhum projeto encontrado"
        />
    </>
  )

  const tableContent = (
    <>
      {tableBody}
    </>
  )

  return (
    <>
      {embedded ? (
        <div className="border-t border-stroke-soft-200 p-5">{tableContent}</div>
      ) : (
        <WidgetCard>{tableContent}</WidgetCard>
      )}

      {selected && (
        <ProjectDrawer project={selected} costData={selectedCostData} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
