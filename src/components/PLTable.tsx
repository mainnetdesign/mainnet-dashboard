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
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[var(--bg2)] border-l border-[var(--bd)] z-50 flex flex-col no-print">
        <div className="flex items-start justify-between p-6 border-b border-[var(--bd)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--tx)] leading-tight">
              {project.clockifyProjectName}
              {project.hasAttention && (
                <span className="ml-2 text-xs text-[var(--tx3)] font-normal">* atenção</span>
              )}
            </h3>
            <span className="inline-block mt-1.5 px-2 py-0.5 border border-[var(--bd2)] text-xs font-medium text-[var(--tx2)]">
              {project.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--tx3)] hover:text-[var(--tx)] hover:bg-[var(--bg3)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px p-6 border-b border-[var(--bd)] bg-[var(--bd)]">
          <div className="bg-[var(--bg2)] p-4">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1">Horas</p>
            <p className="text-2xl font-bold" style={{ color: '#FB923C' }}>{Math.round(project.hours)}h</p>
          </div>
          <div className="bg-[var(--bg2)] p-4">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1">Custo</p>
            <p className="text-2xl font-bold" style={{ color: '#F87171' }}>{fmtBRL(project.cost)}</p>
          </div>
          <div className="bg-[var(--bg2)] p-4">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1">Receita</p>
            <p className="text-2xl font-bold" style={{ color: project.revenue > 0 ? '#22C55E' : undefined }}>
              {project.revenue > 0 ? fmtBRL(project.revenue) : <span className="text-[var(--bd3)]">—</span>}
            </p>
          </div>
          <div className="bg-[var(--bg2)] p-4">
            <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1">Resultado</p>
            <p className={`text-2xl font-bold ${project.result >= 0 ? 'text-[#22C55E]' : 'text-[#F87171]'}`}>
              {project.result >= 0 ? '+' : ''}{fmtBRL(project.result)}
            </p>
          </div>
          {project.margin !== null && (
            <div className="col-span-2 bg-[var(--bg2)] p-4">
              <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-2">Margem</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[var(--bd)] overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, project.margin))}%`, background: project.margin >= 40 ? '#22C55E' : project.margin >= 20 ? '#FBBF24' : '#F87171' }}
                  />
                </div>
                <span className="text-sm font-semibold w-10 text-right" style={{ color: project.margin >= 40 ? '#22C55E' : project.margin >= 20 ? '#FBBF24' : '#F87171' }}>
                  {Math.round(project.margin)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h4 className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-4">
            Breakdown por colaborador
          </h4>
          {collabs.length === 0 ? (
            <p className="text-sm text-[var(--tx3)]">Nenhum dado de colaborador disponível.</p>
          ) : (
            <div className="space-y-4">
              {collabs.map(([userId, data]) => {
                const pct = project.cost > 0 ? (data.cost / project.cost) * 100 : 0
                return (
                  <div key={userId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: data.color }} />
                        <span className="text-sm font-medium text-[var(--tx)]">{data.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-[var(--tx)]">{fmtBRL(data.cost)}</span>
                        <span className="text-xs text-[var(--tx3)] ml-2">{Math.round(data.hours)}h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--bd)] overflow-hidden">
                        <div className="h-full" style={{ width: `${pct}%`, background: data.color }} />
                      </div>
                      <span className="text-xs text-[var(--tx3)] w-8 text-right">{Math.round(pct)}%</span>
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
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="text-right px-3 py-3 text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider cursor-pointer hover:text-[var(--tx2)] select-none"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  const filters: Array<{ key: Filter; label: string; color?: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'profit', label: 'Lucro', color: '#22C55E' },
    { key: 'loss', label: 'Prejuízo', color: '#F87171' },
    { key: 'low-margin', label: 'Margem baixa', color: '#FBBF24' },
  ]

  const statusLabel: Record<string, string> = {
    Lucro: 'Lucro',
    Prejuízo: 'Prejuízo',
    'Margem baixa': 'Margem baixa',
  }

  const statusColor: Record<string, string> = {
    Lucro: 'border-[#22C55E]/40 text-[#22C55E]',
    Prejuízo: 'border-[#F87171]/40 text-[#F87171]',
    'Margem baixa': 'border-[#FBBF24]/40 text-[#FBBF24]',
  }

  const selectedCostData = selected
    ? costByProject.find((c) => c.projectId === selected.clockifyProjectId)
    : undefined

  return (
    <>
      <div className="bg-[var(--bg3)] border border-[var(--bd)]">
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--tx)] mb-1">P&L por projeto — dados reais do Clockify</h2>
              <p className="text-sm text-[var(--tx2)]">
                Custo = horas reais × custo/hora · clique em qualquer linha para ver detalhes
              </p>
            </div>
            <button
              onClick={() => exportCSV(sorted)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[var(--bd)] text-[var(--tx2)] hover:border-[var(--bd3)] hover:text-[var(--tx)] transition-colors whitespace-nowrap no-print"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-4 py-1.5 text-sm font-medium border transition-colors"
                style={filter === f.key
                  ? { background: f.color ?? 'var(--inv)', color: f.color ? '#000' : 'var(--inv-tx)', borderColor: f.color ?? 'var(--inv)' }
                  : f.color
                    ? { borderColor: f.color + '55', color: f.color }
                    : { borderColor: 'var(--bd)', color: 'var(--tx2)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-t border-[var(--bd)]">
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider">
                  Projeto
                </th>
                <SortHeader label="Horas" k="hours" />
                <SortHeader label="Receita" k="revenue" />
                <SortHeader label="Custo" k="cost" />
                <SortHeader label="Resultado" k="result" />
                <SortHeader label="Margem" k="margin" />
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bd)]">
              {sorted.map((p) => (
                <tr
                  key={p.clockifyProjectId}
                  className="hover:bg-[var(--bg4)] transition-colors cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-[var(--tx)]">
                      {p.clockifyProjectName}
                      {p.hasAttention && (
                        <span className="ml-1.5 text-xs text-[var(--tx3)] font-normal">* atenção</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right text-sm font-medium" style={{ color: '#FB923C' }}>{Math.round(p.hours)}h</td>
                  <td className="px-3 py-4 text-right text-sm font-medium" style={{ color: p.revenue > 0 ? '#22C55E' : undefined }}>
                    {p.revenue > 0 ? fmtBRL(p.revenue) : <span className="text-[var(--bd3)]">—</span>}
                  </td>
                  <td className="px-3 py-4 text-right text-sm" style={{ color: '#F87171' }}>{fmtBRL(p.cost)}</td>
                  <td className="px-3 py-4 text-right text-sm font-semibold">
                    <span className={p.result >= 0 ? 'text-[#22C55E]' : 'text-[#F87171]'}>
                      {p.result >= 0 ? '+' : ''}{fmtBRL(p.result)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right text-sm font-medium" style={{ color: p.margin !== null ? (p.margin >= 40 ? '#22C55E' : p.margin >= 20 ? '#FBBF24' : '#F87171') : undefined }}>
                    {p.margin !== null ? `${Math.round(p.margin)}%` : <span className="text-[var(--bd3)]">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-block px-2 py-0.5 border text-xs font-medium ${statusColor[p.status] ?? 'border-[var(--bd2)] text-[var(--tx2)]'}`}>
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
