'use client'
import { useState, useEffect } from 'react'
import { AlertItem } from '@/types'
import WidgetCard from '@/components/ds/WidgetCard'
import Badge from '@/components/ds/Badge'
import * as Button from '@/components/ui/button'
import * as Input from '@/components/ui/input'
import { RiArrowDownSLine, RiSettings3Line } from '@remixicon/react'

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
  loss: { label: 'Prejuízo', icon: '↓', color: '#fb3748', dotColor: '#fb3748' },
  'low-margin': { label: 'Margem baixa', icon: '⚠', color: '#f6b51e', dotColor: '#f6b51e' },
  'no-revenue': { label: 'Sem receita', icon: '○', color: '#a3a3a3', dotColor: '#a3a3a3' },
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
    <div className="border-t border-stroke-soft-200 mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-bg-weak-50 transition-colors text-left"
      >
        <span className="text-label-2xs">
          Histórico de alertas
        </span>
        <div className="flex items-center gap-2">
          <span className="text-paragraph-xs">{history.length} registro{history.length !== 1 ? 's' : ''}</span>
          <svg
            className={`w-3.5 h-3.5 text-text-soft-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="space-y-2 border-t border-stroke-soft-200 p-5">
          {history.map((entry) => (
            <div key={entry.date} className="overflow-hidden rounded-xl border border-stroke-soft-200">
              <button
                onClick={() => toggleDate(entry.date)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg-weak-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-label-sm text-text-strong-950">{formatDate(entry.date)}</span>
                  <Badge variant="neutral">{entry.alerts.length}</Badge>
                </div>
                <svg
                  className={`w-3 h-3 text-text-soft-400 transition-transform ${expandedDates.has(entry.date) ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedDates.has(entry.date) && (
                <div className="space-y-1 border-t border-stroke-soft-200 bg-bg-weak-50 px-4 py-3">
                  {entry.alerts.map((a, i) => {
                    const cfg = TYPE_CONFIG[a.type]
                    return (
                      <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1 text-paragraph-xs">
                        <span className="text-text-strong-950">{a.projectName}</span>
                        <Badge variant={a.type === 'loss' ? 'error' : a.type === 'low-margin' ? 'warning' : 'neutral'}>
                          {cfg.label}
                        </Badge>
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
    <WidgetCard padding="none" className="overflow-hidden no-print">
      <div className="flex items-center justify-between gap-3 border-b border-stroke-soft-200 px-5 py-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left transition-opacity hover:opacity-80"
        >
          <div>
            <h2 className="text-label-md text-text-strong-950">Projetos em risco</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="warning">{filteredAlerts.length} alertas</Badge>
              {losses > 0 && <span className="text-paragraph-xs text-error-base">{losses} prejuízo</span>}
              {lowMargin > 0 && <span className="text-paragraph-xs text-away-base">{lowMargin} margem baixa</span>}
              {noRevenue > 0 && <span className="text-paragraph-xs text-text-soft-400">{noRevenue} sem receita</span>}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Button.Root
            variant="neutral"
            mode="ghost"
            size="xsmall"
            onClick={() => setSettingsOpen((v) => !v)}
            title="Configurar threshold de margem"
          >
            <Button.Icon as={RiSettings3Line} />
          </Button.Root>
          <Button.Root
            variant="neutral"
            mode="ghost"
            size="xsmall"
            onClick={() => setOpen((v) => !v)}
          >
            <Button.Icon as={RiArrowDownSLine} className={open ? 'rotate-180' : undefined} />
          </Button.Root>
        </div>
      </div>

      {settingsOpen && (
        <div className="border-b border-stroke-soft-200 bg-bg-weak-50 px-5 py-4">
          <p className="text-label-sm text-text-strong-950">Threshold de margem baixa</p>
          <p className="mt-0.5 text-paragraph-xs text-text-sub-600">
            Projetos com margem abaixo desse percentual serão exibidos como alerta de margem baixa.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Input.Root size="small" className="w-28">
              <Input.Wrapper>
                <Input.Input
                  type="number"
                  min={1}
                  max={100}
                  value={thresholdInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setThresholdInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && applyThreshold()}
                />
              </Input.Wrapper>
              <Input.Affix>%</Input.Affix>
            </Input.Root>
            <Button.Root variant="primary" mode="filled" size="small" onClick={applyThreshold}>
              Aplicar
            </Button.Root>
            <Button.Root variant="neutral" mode="ghost" size="small" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button.Root>
          </div>
        </div>
      )}

      {open && (
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAlerts.map((alert) => {
              const cfg = TYPE_CONFIG[alert.type]
              return (
                <div key={alert.projectName + alert.type} className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-label-sm text-text-strong-950">{alert.projectName}</p>
                    <Badge variant={alert.type === 'loss' ? 'error' : alert.type === 'low-margin' ? 'warning' : 'neutral'}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-paragraph-xs">
                    <span>Custo: <strong style={{ color: '#fb3748' }}>{fmtBRL(alert.cost)}</strong></span>
                    {alert.revenue > 0 && (
                      <span>Receita: <strong style={{ color: '#1fc16b' }}>{fmtBRL(alert.revenue)}</strong></span>
                    )}
                    <span style={{ color: '#fa7319' }}>{Math.round(alert.hours)}h</span>
                  </div>
                  {alert.result < 0 && (
                    <p className="mt-1 text-label-xs" style={{ color: '#fb3748' }}>
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
    </WidgetCard>
  )
}
