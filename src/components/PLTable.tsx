'use client'
import { useState } from 'react'
import { ProjectPL, ProjectCostData } from '@/types'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

type SortKey = 'hours' | 'revenue' | 'cost' | 'result' | 'margin'
type Filter = 'all' | 'profit' | 'loss' | 'low-margin'

interface Props {
  pl: ProjectPL[]
  costByProject: ProjectCostData[]
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

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 no-print" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-bg-soft-200 border-l border-stroke-soft-200 z-50 flex flex-col no-print">
        <div className="flex items-start justify-between p-6 border-b border-stroke-soft-200">
          <div>
            <h3 className="text-title-h6">
              {project.clockifyProjectName}
              {project.hasAttention && (
                <span className="ml-2 text-paragraph-xs">* atenção</span>
              )}
            </h3>
            <span className="inline-block mt-1.5 px-2 py-0.5 border border-stroke-sub-300 text-label-xs">
              {project.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-soft-400 hover:text-text-strong-950 hover:bg-bg-white-0 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px p-6 border-b border-stroke-soft-200 bg-stroke-soft-200">
          <div className="bg-bg-soft-200 p-4">
            <p className="text-label-2xs mb-1">Horas</p>
            <p className="text-title-h5" style={{ color: '#fa7319' }}>{Math.round(project.hours)}h</p>
          </div>
          <div className="bg-bg-soft-200 p-4">
            <p className="text-label-2xs mb-1">Custo</p>
            <p className="text-title-h5" style={{ color: '#fb3748' }}>{fmtBRL(project.cost)}</p>
          </div>
          <div className="bg-bg-soft-200 p-4">
            <p className="text-label-2xs mb-1">Receita</p>
            <p className="text-title-h5" style={{ color: project.revenue > 0 ? '#1fc16b' : undefined }}>
              {project.revenue > 0 ? fmtBRL(project.revenue) : <span className="text-text-soft-400">—</span>}
            </p>
          </div>
          <div className="bg-bg-soft-200 p-4">
            <p className="text-label-2xs mb-1">Resultado</p>
            <p className={`text-title-h5 ${project.result >= 0 ? 'text-success-base' : 'text-error-base'}`}>
              {project.result >= 0 ? '+' : ''}{fmtBRL(project.result)}
            </p>
          </div>
          {project.margin !== null && (
            <div className="col-span-2 bg-bg-soft-200 p-4">
              <p className="text-label-2xs mb-2">Margem</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-stroke-soft-200 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, project.margin))}%`, background: project.margin >= 40 ? '#1fc16b' : project.margin >= 20 ? '#f6b51e' : '#fb3748' }}
                  />
                </div>
                <span className="text-label-sm w-10 text-right" style={{ color: project.margin >= 40 ? '#1fc16b' : project.margin >= 20 ? '#f6b51e' : '#fb3748' }}>
                  {Math.round(project.margin)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h4 className="text-label-2xs mb-4">
            Breakdown por colaborador
          </h4>
          {collabs.length === 0 ? (
            <p className="text-paragraph-sm">Nenhum dado de colaborador disponível.</p>
          ) : (
            <div className="space-y-4">
              {collabs.map(([userId, data]) => {
                const pct = project.cost > 0 ? (data.cost / project.cost) * 100 : 0
                return (
                  <div key={userId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: data.color }} />
                        <span className="text-label-sm">{data.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-label-sm" style={{ color: '#fb3748' }}>{fmtBRL(data.cost)}</span>
                        <span className="text-paragraph-xs ml-2" style={{ color: '#fa7319' }}>{Math.round(data.hours)}h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-stroke-soft-200 overflow-hidden">
                        <div className="h-full" style={{ width: `${pct}%`, background: data.color }} />
                      </div>
                      <span className="text-paragraph-xs w-8 text-right">{Math.round(pct)}%</span>
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

export default function PLTable({ pl, costByProject }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('result')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
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

  const sorted = [...filtered].sort((a, b) => {
    const av = sortKey === 'margin' ? (a.margin ?? -999) : a[sortKey]
    const bv = sortKey === 'margin' ? (b.margin ?? -999) : b[sortKey]
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="text-right px-3 py-3 text-[11px] font-semibold text-text-soft-400 uppercase tracking-wider cursor-pointer hover:text-text-sub-600 select-none"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  const filters: Array<{ key: Filter; label: string; color?: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'profit', label: 'Lucro', color: '#1fc16b' },
    { key: 'loss', label: 'Prejuízo', color: '#fb3748' },
    { key: 'low-margin', label: 'Margem baixa', color: '#f6b51e' },
  ]

  const statusLabel: Record<string, string> = {
    Lucro: 'Lucro',
    Prejuízo: 'Prejuízo',
    'Margem baixa': 'Margem baixa',
  }

  const statusColor: Record<string, string> = {
    Lucro: 'border-success-light/40 text-success-base',
    Prejuízo: 'border-error-light/40 text-error-base',
    'Margem baixa': 'border-away-light/40 text-away-base',
  }

  const selectedCostData = selected
    ? costByProject.find((c) => c.projectId === selected.clockifyProjectId)
    : undefined

  return (
    <>
      <div className="bg-bg-white-0 border border-stroke-soft-200">
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-label-md mb-1">P&L por projeto — dados reais do Clockify</h2>
              <p className="text-paragraph-sm">
                Custo = horas reais × custo/hora · clique em qualquer linha para ver detalhes
              </p>
            </div>
            <button
              onClick={() => exportCSV(sorted)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-stroke-soft-200 text-text-sub-600 hover:border-stroke-sub-300 hover:text-text-strong-950 transition-colors whitespace-nowrap no-print"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4 no-print">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-paragraph-sm bg-bg-weak-50 border border-stroke-soft-200 placeholder-[var(--color-text-soft-400)] focus:outline-none focus:border-stroke-sub-300 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-soft-400 hover:text-text-strong-950">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-4 py-1.5 text-label-sm border transition-colors"
                style={filter === f.key
                  ? { background: f.color ?? 'var(--color-bg-strong-950)', color: f.color ? '#000' : 'var(--color-text-white-0)', borderColor: f.color ?? 'var(--color-bg-strong-950)' }
                  : f.color
                    ? { borderColor: f.color + '55', color: f.color }
                    : { borderColor: 'var(--color-stroke-soft-200)', color: 'var(--color-text-sub-600)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-t border-stroke-soft-200">
              <tr>
                <th className="text-left px-6 py-3 text-label-2xs">
                  Projeto
                </th>
                <SortHeader label="Horas" k="hours" />
                <SortHeader label="Receita" k="revenue" />
                <SortHeader label="Custo" k="cost" />
                <SortHeader label="Resultado" k="result" />
                <SortHeader label="Margem" k="margin" />
                <th className="text-right px-6 py-3 text-label-2xs">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-stroke-soft-200)]">
              {sorted.map((p) => (
                <tr
                  key={p.clockifyProjectId}
                  className="hover:bg-bg-weak-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-label-sm">
                        {p.clockifyProjectName}
                        {p.hasAttention && (
                          <span className="ml-1.5 text-paragraph-xs">* atenção</span>
                        )}
                      </span>
                      {p.hours === 0 && p.revenue > 0 && (
                        <span className="shrink-0 px-1.5 py-0.5 text-label-2xs border"
                          style={{ color: '#a3a3a3', borderColor: '#a3a3a344', background: '#a3a3a30D' }}>
                          sem horas
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right text-label-sm" style={{ color: '#fa7319' }}>{Math.round(p.hours)}h</td>
                  <td className="px-3 py-4 text-right text-label-sm" style={{ color: p.revenue > 0 ? '#1fc16b' : undefined }}>
                    {p.revenue > 0 ? fmtBRL(p.revenue) : <span className="text-text-soft-400">—</span>}
                  </td>
                  <td className="px-3 py-4 text-right text-paragraph-sm" style={{ color: '#fb3748' }}>{fmtBRL(p.cost)}</td>
                  <td className="px-3 py-4 text-right text-label-sm">
                    <span className={p.result >= 0 ? 'text-success-base' : 'text-error-base'}>
                      {p.result >= 0 ? '+' : ''}{fmtBRL(p.result)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right text-label-sm" style={{ color: p.margin !== null ? (p.margin >= 40 ? '#1fc16b' : p.margin >= 20 ? '#f6b51e' : '#fb3748') : undefined }}>
                    {p.margin !== null ? `${Math.round(p.margin)}%` : <span className="text-text-soft-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-block px-2 py-0.5 border text-label-xs ${statusColor[p.status] ?? 'border-stroke-sub-300 text-text-sub-600'}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ProjectDrawer
          project={selected}
          costData={selectedCostData}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
