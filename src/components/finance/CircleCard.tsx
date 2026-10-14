'use client'
import { WidgetCard } from '@/components/ds'
import type { CircleData } from '@/types'

const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtUSD(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

function fmtDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-paragraph-sm">
      <span className="text-text-sub-600">{label}</span>
      <span className={className ?? 'text-label-sm text-text-strong-950'}>{value}</span>
    </div>
  )
}

export default function CircleCard({ circle, currentMonth }: { circle: CircleData; currentMonth: string }) {
  const monthName = MONTHS_LONG[Number(currentMonth.slice(5, 7)) - 1]
  const next = circle.nextInvoices[0]

  return (
    <WidgetCard className="flex min-w-0 flex-col gap-5">
      <div>
        <p className="text-label-sm text-text-strong-950">{circle.client}</p>
        <p className="text-paragraph-xs text-text-soft-400">{circle.service} · pago via {circle.platform}</p>
      </div>

      <div>
        <p className="font-display text-title-h4 text-text-strong-950">{fmtUSD(circle.annualUSD)}</p>
        <p className="text-paragraph-xs text-text-soft-400">por ano · {fmtUSD(circle.monthlyUSD)} por mês</p>
      </div>

      <div className="divide-y divide-stroke-soft-200">
        <Row label="Bruto no mês" value={fmtBRL(circle.monthlyGrossBRL)} />
        <Row label={`Imposto (${Math.round(circle.taxRate * 100)}%)`} value={`− ${fmtBRL(circle.monthlyTaxBRL)}`} />
        <Row label={`Spread ${circle.platform} (estimado)`} value={`− ${fmtBRL(circle.monthlySpreadBRL)}`} />
        <Row label="Líquido no mês" value={fmtBRL(circle.monthlyNetBRL)} className="text-label-md text-success-base" />
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-stroke-soft-200 pt-4 text-paragraph-xs text-text-sub-600">
        <p>
          Recebido em {monthName}: <span className="text-text-strong-950">{fmtBRL(circle.receivedThisMonthBRL)}</span>
        </p>
        {next && (
          <p>
            Próxima fatura: <span className="text-text-strong-950">{fmtDate(next.date)} · {fmtUSD(next.amountUSD)}</span>
          </p>
        )}
      </div>
    </WidgetCard>
  )
}
