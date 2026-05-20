'use client'
import { useState, useEffect } from 'react'
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
  loss: { label: 'Prejuízo', icon: '↓', color: '#F87171', dotColor: '#F87171' },
  'low-margin': { label: 'Margem baixa', icon: '⚠', color: '#FBBF24', dotColor: '#FBBF24' },
  'no-revenue': { label: 'Sem receita', icon: '○', color: '#9CA3AF', dotColor: '#9CA3AF' },
}

const THRESHOLD_KEY = 'mainnet-alert-threshold'
const HISTORY_KEY = 'mainnet-alert-history'
const DEFAULT_THRESHOLD = 30

interface HistoryEntry {
  date: string
  alerts: AlertItem[]
  snapshot: string
}

function saveAlertHistory(alerts: AlertItem[]) {
  if (typeof window === 'undefined' || alerts.length === 0) return
  try {
    const today = new Date().toISOString().split('T')[0]
    const raw = localStorage.getItem(HISTORY_KEY)
    const history: HistoryEntry[] = raw ? JSON.parse(raw) : []
    const filtered = history.filter((e) => e.date !== today)
    const entry: HistoryEntry = {
      date: today,
      alerts,
      snapshot: `${alerts.length} alerta${alerts.length !== 1 ? 's' : ''}`,
    }
    const updated = [entry, ...filtered].slice(0, 30)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch { /* noop */ }
}

function AlertHistory({ alerts }: { alerts: AlertItem[] }) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [open, setOpen] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    saveAlertHistory(alerts)
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch { /* noop */ }
  }, [alerts])

  if (history.length === 0) return null

  function toggleDate(date: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="border-t border-[var(--bd)] mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-[var(--bg4)] transition-colors text-left"
      >
        <span className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider">
          Histórico de alertas
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--tx3)]">{history.length} registro{history.length !== 1 ? 's' : ''}</span>
          <svg
            className={`w-3.5 h-3.5 text-[var(--tx3)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-6 pb-4 space-y-1.5">
          {history.map((entry) => (
            <div key={entry.date} className="border border-[var(--bd)] overflow-hidden">
              <button
                onClick={() => toggleDate(entry.date)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg4)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[var(--tx2)]">{formatDate(entry.date)}</span>
                  <span className="px-1.5 py-0.5 border border-[var(--bd2)] text-xs font-semibold text-[var(--tx3)]">
                    {entry.alerts.length}
                  </span>
                </div>
                <svg
                  className={`w-3 h-3 text-[var(--tx3)] transition-transform ${expandedDates.has(entry.date) ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedDates.has(entry.date) && (
                <div className="px-4 pb-3 pt-1 space-y-1 bg-[var(--bg2)]">
                  {entry.alerts.map((a, i) => {
                    const cfg = TYPE_CONFIG[a.type]
                    return (
                      <div key={i} className="flex items-center justify-between text-xs text-[var(--tx2)] py-0.5">
                        <span className="font-medium text-[var(--tx)]">{a.projectName}</span>
                        <span className="px-1.5 py-0.5 border text-xs" style={{ color: cfg.color, borderColor: cfg.color + '66' }}>
                          {cfg.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AlertsPanel({ alerts }: Props) {
  const [open, setOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD)
  const [thresholdInput, setThresholdInput] = useState<string>(String(DEFAULT_THRESHOLD))

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THRESHOLD_KEY)
      if (stored !== null) {
        const val = Number(stored)
        if (!isNaN(val) && val > 0 && val <= 100) {
          setThreshold(val)
          setThresholdInput(String(val))
        }
      }
    } catch { /* noop */ }
  }, [])

  function applyThreshold() {
    const val = Number(thresholdInput)
    if (!isNaN(val) && val > 0 && val <= 100) {
      setThreshold(val)
      try { localStorage.setItem(THRESHOLD_KEY, String(val)) } catch { /* noop */ }
      setSettingsOpen(false)
    }
  }

  const filteredAlerts = alerts.filter((a) => {
    if (a.type !== 'low-margin') return true
    const margin = a.revenue > 0 ? ((a.revenue - a.cost) / a.revenue) * 100 : null
    if (margin === null) return true
    return margin < threshold
  })

  if (filteredAlerts.length === 0 && alerts.length === 0) return null

  const losses = filteredAlerts.filter((a) => a.type === 'loss').length
  const lowMargin = filteredAlerts.filter((a) => a.type === 'low-margin').length
  const noRevenue = filteredAlerts.filter((a) => a.type === 'no-revenue').length

  return (
    <div className="mb-8 bg-[var(--bg3)] border border-[var(--bd)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bd)]">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
        >
          <h2 className="text-base font-bold text-[var(--tx)]">Projetos em risco</h2>
          <span className="px-2 py-0.5 border border-[var(--bd2)] text-xs font-semibold text-[var(--tx2)]">
            {filteredAlerts.length}
          </span>
          <div className="hidden sm:flex items-center gap-3">
            {losses > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--tx2)]">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#F87171' }} />
                {losses} prejuízo
              </span>
            )}
            {lowMargin > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--tx2)]">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#FBBF24' }} />
                {lowMargin} margem baixa
              </span>
            )}
            {noRevenue > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--tx2)]">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#9CA3AF' }} />
                {noRevenue} sem receita
              </span>
            )}
          </div>
          <span className="hidden sm:inline-flex px-2 py-0.5 border border-[var(--bd)] text-xs font-medium text-[var(--tx3)]">
            Alerta: {threshold}%
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setSettingsOpen((v) => !v) }}
            className={`p-1.5 transition-colors ${settingsOpen ? 'bg-[var(--bd)] text-[var(--tx)]' : 'text-[var(--tx3)] hover:text-[var(--tx)] hover:bg-[var(--bg4)]'}`}
            title="Configurar threshold de margem"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button onClick={() => setOpen((v) => !v)}>
            <svg
              className={`w-4 h-4 text-[var(--tx3)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="px-6 py-4 bg-[var(--bg2)] border-b border-[var(--bd)]">
          <p className="text-sm font-semibold text-[var(--tx)] mb-2">Threshold de margem baixa</p>
          <p className="text-xs text-[var(--tx3)] mb-3">
            Projetos com margem abaixo desse percentual serão exibidos como alerta de margem baixa.
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyThreshold()}
                className="w-24 px-3 py-1.5 pr-8 text-sm bg-[var(--bg3)] border border-[var(--bd)] text-[var(--tx)] focus:outline-none focus:border-[var(--bd3)]"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--tx3)]">%</span>
            </div>
            <button
              onClick={applyThreshold}
              className="px-3 py-1.5 text-sm font-medium bg-[var(--inv)] text-[var(--inv-tx)] hover:opacity-80 transition-opacity"
            >
              Aplicar
            </button>
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-3 py-1.5 text-sm font-medium text-[var(--tx3)] hover:text-[var(--tx)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px pt-4 bg-[var(--bd)]">
            {filteredAlerts.map((alert) => {
              const cfg = TYPE_CONFIG[alert.type]
              return (
                <div
                  key={alert.projectName + alert.type}
                  className="bg-[var(--bg3)] p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-[var(--tx)] leading-snug">{alert.projectName}</p>
                    <span className="shrink-0 text-xs font-semibold px-2 py-0.5 border" style={{ color: cfg.color, borderColor: cfg.color + '66' }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--tx3)]">
                    <span>Custo: <strong className="text-[var(--tx2)]">{fmtBRL(alert.cost)}</strong></span>
                    {alert.revenue > 0 && (
                      <span>Receita: <strong className="text-[var(--tx2)]">{fmtBRL(alert.revenue)}</strong></span>
                    )}
                    <span>{Math.round(alert.hours)}h</span>
                  </div>
                  {alert.result < 0 && (
                    <p className="mt-1.5 text-xs font-semibold text-[var(--tx2)]">
                      Resultado: {fmtBRL(alert.result)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AlertHistory alerts={alerts} />
    </div>
  )
}
