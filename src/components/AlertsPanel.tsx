'use client'
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
    icon: '↓',
  },
  'low-margin': {
    label: 'Margem baixa',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: '⚠',
  },
  'no-revenue': {
    label: 'Sem receita',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    icon: '○',
  },
}

export default function AlertsPanel({ alerts }: Props) {
  if (alerts.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold text-gray-900">Projetos em risco</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          {alerts.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
              <div className="flex gap-4 text-xs text-gray-600">
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
  )
}
