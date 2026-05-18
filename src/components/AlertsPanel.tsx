'use client'
import { useState } from 'react'
import { AlertItem } from '@/types'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

interface Props {
  alerts: AlertItem[]
}

const TYPE_CONFIG = {
  loss: {
    label: 'Prejuízo',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-400',
    icon: '↓',
  },
  'low-margin': {
    label: 'Margem baixa',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-400',
    icon: '⚠',
  },
  'no-revenue': {
    label: 'Sem receita',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-400',
    icon: '○',
  },
}

export default function AlertsPanel({ alerts }: Props) {
  const [open, setOpen] = useState(true)

  if (alerts.length === 0) return null

  const losses = alerts.filter((a) => a.type === 'loss').length
  const lowMargin = alerts.filter((a) => a.type === 'low-margin').length
  const noRevenue = alerts.filter((a) => a.type === 'no-revenue').length

  return (
    <div className="mb-8 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header — always visible, clickable to toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900">Projetos em risco</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            {alerts.length}
          </span>
          {/* Summary chips */}
          <div className="hidden sm:flex items-center gap-2">
            {losses > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                {losses} prejuízo
              </span>
            )}
            {lowMargin > 0 && (
              <span className="flex items-center gap-1 text-xs text-yellow-700">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                {lowMargin} margem baixa
              </span>
            )}
            {noRevenue > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                {noRevenue} sem receita
              </span>
            )}
          </div>
        </div>
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-6 pb-6 border-t border-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
            {alerts.map((alert) => {
              const cfg = TYPE_CONFIG[alert.type]
              return (
                <div
                  key={alert.projectName + alert.type}
                  className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      {alert.projectName}
                    </p>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>Custo: <strong>{fmtBRL(alert.cost)}</strong></span>
                    {alert.revenue > 0 && (
                      <span>Receita: <strong>{fmtBRL(alert.revenue)}</strong></span>
                    )}
                    <span>{Math.round(alert.hours)}h</span>
                  </div>
                  {alert.result < 0 && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">
                      Resultado: {fmtBRL(alert.result)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
