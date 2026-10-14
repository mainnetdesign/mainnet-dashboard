'use client'
import { useState, useSyncExternalStore } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { RiPencilLine } from '@remixicon/react'
import { AreaGradient, CHART_TOKENS, TOOLTIP_CARD } from '@/components/charts/chart-primitives'
import { WidgetCard } from '@/components/ds'

const STORAGE_KEY = 'mainnet-finance:cash'
const MAX_PROJECTION_MONTHS = 24
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

type CashState = { value: number; updatedAt: string }

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

function saveCash(state: CashState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  listeners.forEach((l) => l())
}

function parseCash(raw: string | null): CashState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CashState
    return Number.isFinite(parsed.value) ? parsed : null
  } catch {
    return null
  }
}

/** Aceita "12.345,67", "12345.67" ou "12345" */
function parseBRLInput(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  const n = Number(normalized)
  return normalized && Number.isFinite(n) ? n : null
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function addMonths(base: Date, n: number) {
  return new Date(base.getFullYear(), base.getMonth() + n, 1)
}

/** netBurn ≤ 0 significa que a empresa sobra dinheiro todo mês */
export default function RunwayCard({ netBurn }: { netBurn: number }) {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(STORAGE_KEY), () => null)
  const cash = parseCash(raw)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => {
    setDraft(cash ? String(cash.value).replace('.', ',') : '')
    setEditing(true)
  }

  const commit = () => {
    const value = parseBRLInput(draft)
    if (value !== null) saveCash({ value, updatedAt: new Date().toISOString() })
    setEditing(false)
  }

  const sustainable = netBurn <= 0
  const runwayMonths = cash && !sustainable ? Math.max(0, cash.value / netBurn) : null
  const now = new Date()
  const endDate = runwayMonths !== null ? addMonths(now, Math.floor(runwayMonths)) : null

  const projectionLength = runwayMonths !== null
    ? Math.min(MAX_PROJECTION_MONTHS, Math.ceil(runwayMonths) + 1)
    : 12
  const projection = cash
    ? Array.from({ length: projectionLength + 1 }, (_, i) => {
        const d = addMonths(now, i)
        return {
          label: i === 0 ? 'Hoje' : `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
          saldo: Math.round(cash.value - netBurn * i),
        }
      })
    : []

  return (
    <WidgetCard className="flex min-w-0 flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-sm text-text-strong-950">Caixa</p>
          <p className="text-paragraph-xs text-text-soft-400">
            {cash ? `atualizado em ${new Date(cash.updatedAt).toLocaleDateString('pt-BR')}` : 'informe o saldo atual'}
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            title="Editar saldo"
            className="rounded-lg p-1.5 text-text-soft-400 hover:bg-bg-weak-50 hover:text-text-strong-950"
          >
            <RiPencilLine className="size-4" />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); commit() }}>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="Ex.: 25.000,00"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
            className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-label-md text-text-strong-950 focus:border-stroke-sub-300 focus:outline-none"
          />
        </form>
      ) : (
        <button type="button" onClick={startEdit} className="text-left">
          {cash ? (
            <p className="font-display text-title-h4 text-text-strong-950">{fmtBRL(cash.value)}</p>
          ) : (
            <p className="text-label-md text-information-base hover:underline">+ Informar saldo em caixa</p>
          )}
        </button>
      )}

      <p className="text-paragraph-sm text-text-sub-600">
        {sustainable
          ? <>A empresa sobra <span className="text-success-base">{fmtBRL(-netBurn)}</span> por mês — runway sustentável.</>
          : runwayMonths !== null && endDate
            ? <>O caixa dura <span className="text-text-strong-950">{runwayMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses</span>, até {MONTHS_LONG[endDate.getMonth()]} de {endDate.getFullYear()}.</>
            : <>A empresa gasta {fmtBRL(netBurn)} a mais do que recebe por mês.</>}
      </p>

      {cash && (
        <div className="mt-auto">
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={projection} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <AreaGradient id="gradCash" color={CHART_TOKENS.info} />
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-text-soft-400)' }}
                axisLine={false} tickLine={false} tickMargin={6}
                interval="preserveStartEnd"
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-stroke-sub-300)', strokeWidth: 1 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className={TOOLTIP_CARD}>
                      <p className="text-label-xs text-text-soft-400">{label}</p>
                      <p className="text-label-sm text-text-strong-950">{fmtBRL(Number(payload[0].value))}</p>
                    </div>
                  ) : null
                }
              />
              <Area type="linear" dataKey="saldo" stroke={CHART_TOKENS.info} strokeWidth={2} fill="url(#gradCash)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  )
}
