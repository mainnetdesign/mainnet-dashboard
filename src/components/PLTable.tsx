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

// ── Drawer ─────────────────────────────────────────────────────────────────
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

  const statusColors: Record<string, string> = {
    Lucro: 'text-green-600 bg-green-50',
    Prejuízo: 'text-red-600 bg-red-50',
    'Margem baixa': 'text-yellow-700 bg-yellow-50',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 no-print"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col no-print">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {project.clockifyProjectName}
              {project.hasAttention && (
                <span className="ml-2 text-xs text-amber-500 font-normal">* atenção</span>
              )}
            </h3>
            <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium ${statusColors[project.status]}`}>
              {project.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 p-6 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Horas</p>
            <p className="text-2xl font-bold text-gray-900">{Math.round(project.hours)}h</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Custo</p>
            <p className="text-2xl font-bold text-gray-900">{fmtBRL(project.cost)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Receita</p>
            <p className="text-2xl font-bold text-gray-900">
              {project.revenue > 0 ? fmtBRL(project.revenue) : <span className="text-gray-300">—</span>}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Resultado</p>
            <p className={`text-2xl font-bold ${project.result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {project.result >= 0 ? '+' : ''}{fmtBRL(project.result)}
            </p>
          </div>
          {project.margin !== null && (
            <div className="col-span-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Margem</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      project.margin >= 40 ? 'bg-green-400' :
                      project.margin >= 20 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, project.margin))}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-10 text-right">
                  {Math.round(project.margin)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Collaborator breakdown */}
        <div className="flex-1 overflow-y-auto p-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Breakdown por colaborador
          </h4>
          {collabs.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum dado de colaborador disponível.</p>
          ) : (
            <div className="space-y-4">
              {collabs.map(([userId, data]) => {
                const pct = project.cost > 0 ? (data.cost / project.cost) * 100 : 0
                return (
                  <div key={userId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: data.color }}
                        />
                        <span className="text-sm font-medium text-gray-800">{data.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{fmtBRL(data.cost)}</span>
                        <span className="text-xs text-gray-400 ml-2">{Math.round(data.hours)}h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: data.color }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{Math.round(pct)}%</span>
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

// ── Main Table ─────────────────────────────────────────────────────────────
export default function PLTable({ pl, costByProject }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('result')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<ProjectPL | null>(null)

  const filtered = pl.filter((p) => {
    if (filter === 'all') return true
    if (filter === 'profit') return p.status === 'Lucro'
    if (filter === 'loss') return p.status === 'Prejuízo'
    if (filter === 'low-margin') return p.status === 'Margem baixa'
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const av = sortKey === 'margin' ? (a.margin ?? -999) : a[sortKey]
    const bv = sortKey === 'margin' ? (b.margin ?? -999) : b[sortKey]
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="text-right px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  const filters: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'profit', label: 'Lucro' },
    { key: 'loss', label: 'Prejuízo' },
    { key: 'low-margin', label: 'Margem baixa' },
  ]

  const statusColors: Record<string, string> = {
    Lucro: 'text-green-600 bg-green-50',
    Prejuízo: 'text-red-600 bg-red-50',
    'Margem baixa': 'text-yellow-700 bg-yellow-50',
  }

  const selectedCostData = selected
    ? costByProject.find((c) => c.projectId === selected.clockifyProjectId)
    : undefined

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">P&L por projeto — dados reais do Clockify</h2>
              <p className="text-sm text-gray-500">
                Custo = horas reais × custo/hora · clique em qualquer linha para ver detalhes
              </p>
            </div>
            <button
              onClick={() => exportCSV(sorted)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors whitespace-nowrap no-print"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 no-print">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filter === f.key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-t border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Projeto
                </th>
                <SortHeader label="Horas" k="hours" />
                <SortHeader label="Receita" k="revenue" />
                <SortHeader label="Custo" k="cost" />
                <SortHeader label="Resultado" k="result" />
                <SortHeader label="Margem" k="margin" />
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((p) => (
                <tr
                  key={p.clockifyProjectId}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {p.clockifyProjectName}
                      {p.hasAttention && (
                        <span className="ml-1.5 text-xs text-amber-500 font-normal">* atenção</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right text-sm text-gray-600">
                    {Math.round(p.hours)}h
                  </td>
                  <td className="px-3 py-4 text-right text-sm text-gray-600">
                    {p.revenue > 0 ? fmtBRL(p.revenue) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-4 text-right text-sm text-gray-600">{fmtBRL(p.cost)}</td>
                  <td className="px-3 py-4 text-right text-sm font-semibold">
                    <span className={p.result >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {p.result >= 0 ? '+' : ''}
                      {fmtBRL(p.result)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right text-sm text-gray-600">
                    {p.margin !== null ? `${Math.round(p.margin)}%` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
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
