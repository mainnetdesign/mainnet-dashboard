'use client'
import { useState } from 'react'
import { ProjectPL } from '@/types'

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
}

export default function PLTable({ pl }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('result')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState<Filter>('all')

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 pb-4">
        <h2 className="text-base font-bold text-gray-900 mb-1">P&L por projeto — dados reais do Clockify</h2>
        <p className="text-sm text-gray-500 mb-4">
          Custo = horas reais × custo/hora · clique em qualquer coluna para ordenar
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
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
              <tr key={p.clockifyProjectId} className="hover:bg-gray-50 transition-colors">
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
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[p.status]}`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
